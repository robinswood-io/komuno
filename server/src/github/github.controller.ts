import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { AdminService } from '../admin/admin.service';

interface GitHubIssuePayload {
  action: 'opened' | 'edited' | 'closed' | 'reopened';
  issue: {
    number: number;
    state: 'open' | 'closed';
    html_url: string;
    title: string;
    labels?: Array<{ name?: string }>;
  };
}

type RawBodyRequest = Request & { rawBody?: string };

@ApiTags('github')
@Controller('api/github')
export class GitHubController {
  constructor(private readonly adminService: AdminService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook GitHub pour synchroniser les issues' })
  @ApiResponse({ status: 200, description: 'Webhook traité avec succès' })
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: GitHubIssuePayload,
  ) {
    this.verifySignature(req, signature);

    if (event !== 'issues') {
      return { success: true, ignored: true };
    }

    if (!body || !body.issue) {
      return { success: false, message: 'Payload invalide' };
    }

    if (!['opened', 'edited', 'closed', 'reopened'].includes(body.action)) {
      return { success: true, ignored: true };
    }

    return await this.adminService.syncDevelopmentRequestFromGitHub({
      issueNumber: body.issue.number,
      issueUrl: body.issue.html_url,
      state: body.issue.state,
      title: body.issue.title,
      labels: Array.isArray(body.issue.labels)
        ? body.issue.labels.map((label) => label.name).filter((labelName): labelName is string => Boolean(labelName))
        : undefined,
    });
  }

  private verifySignature(req: RawBodyRequest, signature: string | undefined): void {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return;
    }

    if (!signature) {
      throw new UnauthorizedException('Signature GitHub manquante');
    }

    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body ?? {});
    const digest = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);

    if (digestBuffer.length !== signatureBuffer.length || !timingSafeEqual(digestBuffer, signatureBuffer)) {
      throw new UnauthorizedException('Signature GitHub invalide');
    }
  }
}
