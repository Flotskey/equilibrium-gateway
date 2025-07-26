import { ApiPropertyOptional } from '@nestjs/swagger';

export class FundingRatesDto {
  @ApiPropertyOptional({ type: [String], description: 'Array of symbols to fetch funding rates for' })
  symbols?: string[];

  @ApiPropertyOptional({ type: Object, description: 'Exchange specific parameters' })
  params?: Record<string, any>;
}
