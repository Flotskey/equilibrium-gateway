import { ApiPropertyOptional } from '@nestjs/swagger';

export class FundingIntervalDto {
  @ApiPropertyOptional({ type: Object, description: 'Exchange specific parameters' })
  params?: Record<string, any>;
}
