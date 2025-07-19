import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchTradesDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiPropertyOptional()
  symbol?: string;

  @ApiPropertyOptional()
  since?: number; // timestamp in milliseconds

  @ApiPropertyOptional()
  limit?: number; // number of trades to fetch

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
