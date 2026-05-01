import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { promises as fs } from 'fs';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';
import { logger } from '../../../lib/logger';

@Injectable()
export class MinIOService implements OnModuleInit {
  private client: Client | null = null;
  private endpoint: string;
  private port: number;
  private externalPort: number;
  private useSSL: boolean;
  private accessKey: string;
  private secretKey: string;
  private bucketLoanItems: string;
  private bucketAssets: string;
  private initialized: boolean = false;

  constructor(private configService: ConfigService) {
    this.endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    this.port = parseInt(process.env.MINIO_PORT || '9000', 10);
    this.externalPort = parseInt(process.env.MINIO_EXTERNAL_PORT || '9002', 10);
    this.useSSL = process.env.MINIO_USE_SSL === 'true';
    this.accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    this.secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
    this.bucketLoanItems = process.env.MINIO_BUCKET_LOAN_ITEMS || 'loan-items';
    this.bucketAssets = process.env.MINIO_BUCKET_ASSETS || 'assets';
  }

  async onModuleInit() {
    // Initialisation optionnelle non bloquante
    void this.initialize().catch((error) => {
      logger.warn('MinIO initialization failed at module init, will retry on first use', { error });
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized && this.client) {
      return;
    }

    try {
      this.client = new Client({
        endPoint: this.endpoint,
        port: this.port,
        useSSL: this.useSSL,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      });

      try {
        await this.client.listBuckets();
      } catch (listError) {
        logger.warn('MinIO connection test failed, will retry on first operation', { error: listError });
      }

      await this.ensureBuckets();
      this.initialized = true;
      logger.info('MinIO service initialized', {
        endpoint: this.endpoint,
        port: this.port,
        buckets: [this.bucketLoanItems, this.bucketAssets],
      });
    } catch (error) {
      logger.error('Failed to initialize MinIO service', { error });
      this.initialized = false;
      throw error;
    }
  }

  async ensureBuckets(): Promise<void> {
    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const buckets = [this.bucketLoanItems, this.bucketAssets];

      for (const bucket of buckets) {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, 'us-east-1');
          await this.client.setBucketPolicy(
            bucket,
            JSON.stringify({
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: { AWS: ['*'] },
                  Action: ['s3:GetObject'],
                  Resource: [`arn:aws:s3:::${bucket}/*`],
                },
              ],
            })
          );
          logger.info('MinIO bucket created', { bucket });
        }
      }
    } catch (error) {
      logger.error('Failed to ensure MinIO buckets', { error });
      throw error;
    }
  }

  async uploadFile(
    bucket: string,
    filename: string,
    buffer: Buffer,
    mimetype: string
  ): Promise<void> {
    if (!this.client || !this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const bucketExists = await this.client.bucketExists(bucket);
      if (!bucketExists) {
        await this.ensureBuckets();
      }

      await this.client.putObject(bucket, filename, buffer, buffer.length, {
        'Content-Type': mimetype,
      });
      logger.debug('File uploaded to MinIO', { bucket, filename, size: buffer.length });
    } catch (error) {
      logger.error('Failed to upload file to MinIO', { bucket, filename, error });
      throw error;
    }
  }

  async deleteFile(bucket: string, filename: string): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      await this.client.removeObject(bucket, filename);
      logger.debug('File deleted from MinIO', { bucket, filename });
    } catch (error: any) {
      if (error.code !== 'NoSuchKey') {
        logger.error('Failed to delete file from MinIO', { bucket, filename, error });
        throw error;
      }
    }
  }

  async getObjectStream(bucket: string, filename: string): Promise<NodeJS.ReadableStream> {
    if (!this.client || !this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('MinIO client not initialized');
    }

    try {
      const stream = await this.client.getObject(bucket, filename);
      return stream;
    } catch (error) {
      logger.error('Failed to get object stream from MinIO', { bucket, filename, error });
      throw error;
    }
  }

  getFileUrl(bucket: string, filename: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    const host = this.endpoint === 'minio' ? 'localhost' : this.endpoint;
    const port = this.endpoint === 'minio' ? this.externalPort : this.port;
    return `${protocol}://${host}:${port}/${bucket}/${filename}`;
  }

  getPhotoUrl(filename: string): string {
    return this.getFileUrl(this.bucketLoanItems, filename);
  }

  getAssetUrl(filename: string): string {
    return this.getFileUrl(this.bucketAssets, filename);
  }

  get loanItemsBucket(): string {
    return this.bucketLoanItems;
  }

  get assetsBucket(): string {
    return this.bucketAssets;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; connected: boolean; buckets: string[]; error?: string }> {
    try {
      if (!this.client) {
        await this.initialize();
      }

      if (!this.client) {
        return {
          status: 'unhealthy',
          connected: false,
          buckets: [],
          error: 'Client not initialized'
        };
      }

      const buckets = await this.client.listBuckets();
      const bucketNames = buckets.map((b: { name: string }) => b.name);
      
      const requiredBuckets = [this.bucketLoanItems, this.bucketAssets];
      const missingBuckets = requiredBuckets.filter((b: string) => !bucketNames.includes(b));
      
      if (missingBuckets.length > 0) {
        await this.ensureBuckets();
      }

      return {
        status: 'healthy',
        connected: true,
        buckets: bucketNames
      };
    } catch (error: any) {
      logger.error('MinIO health check failed', { error });
      return {
        status: 'unhealthy',
        connected: false,
        buckets: [],
        error: error.message || 'Unknown error'
      };
    }
  }

  async migrateLocalFiles(deleteAfterMigration: boolean = false): Promise<{
    loanItems: { success: number; errors: number };
    assets: { success: number; errors: number };
  }> {
    if (!this.client) {
      await this.initialize();
    }

    const results = {
      loanItems: { success: 0, errors: 0 },
      assets: { success: 0, errors: 0 },
    };

    try {
      const loanItemsDir = join(process.cwd(), 'public', 'uploads', 'loan-items');
      try {
        const files = await readdir(loanItemsDir);
        for (const file of files) {
          try {
            const filePath = join(loanItemsDir, file);
            const stats = await stat(filePath);
            if (stats.isFile()) {
              const buffer = await fs.readFile(filePath);
              const ext = file.split('.').pop()?.toLowerCase();
              const mimetype = this.getMimeType(ext || '');
              await this.uploadFile(this.bucketLoanItems, file, buffer, mimetype);
              results.loanItems.success++;

              if (deleteAfterMigration) {
                await fs.unlink(filePath);
              }
            }
          } catch (error) {
            logger.error('Failed to migrate loan item file', { file, error });
            results.loanItems.errors++;
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          logger.warn('Loan items directory not found or not accessible', { path: loanItemsDir, error });
        }
      }

      const assetsDir = join(process.cwd(), 'attached_assets');
      try {
        const files = await readdir(assetsDir);
        for (const file of files) {
          try {
            const filePath = join(assetsDir, file);
            const stats = await stat(filePath);
            if (stats.isFile()) {
              const buffer = await fs.readFile(filePath);
              const ext = file.split('.').pop()?.toLowerCase();
              const mimetype = this.getMimeType(ext || '');
              await this.uploadFile(this.bucketAssets, file, buffer, mimetype);
              results.assets.success++;

              if (deleteAfterMigration) {
                await fs.unlink(filePath);
              }
            }
          } catch (error) {
            logger.error('Failed to migrate asset file', { file, error });
            results.assets.errors++;
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          logger.warn('Assets directory not found or not accessible', { path: assetsDir, error });
        }
      }

      logger.info('MinIO migration completed', results);
      return results;
    } catch (error) {
      logger.error('Failed to migrate files to MinIO', { error });
      throw error;
    }
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}
