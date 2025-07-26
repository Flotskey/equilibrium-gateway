import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FundingRateHistoryDto {
  @ApiProperty({ description: 'The symbol to fetch funding rate history for' })
  symbol: string;

  @ApiPropertyOptional({ description: 'Timestamp in milliseconds to fetch from' })
  since?: number;

  @ApiPropertyOptional({ description: 'Number of records to fetch' })
  limit?: number;

  @ApiPropertyOptional({ type: Object, description: 'Exchange specific parameters' })
  params?: Record<string, any>;
}
