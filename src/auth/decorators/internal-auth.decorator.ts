import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

export function InternalAuth() {
  return applyDecorators(
    UseGuards(InternalApiKeyGuard),
    ApiSecurity('internal-api-key'),
  );
}
