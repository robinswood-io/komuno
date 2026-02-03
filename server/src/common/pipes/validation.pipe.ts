import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodError, z } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Validation pipe personnalisé pour utiliser Zod
 * Permet de conserver la validation Zod existante
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodType<any>) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // Only validate explicit request data (body/query/param). Skip custom decorators like @Req/@User.
    if (metadata.type === 'custom') {
      return value;
    }
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(fromZodError(error).toString());
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
