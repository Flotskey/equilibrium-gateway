import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  type: string; // 'limit' or 'market'

  @ApiProperty()
  side: string; // 'buy' or 'sell'

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
