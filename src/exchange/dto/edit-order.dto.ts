import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EditOrderDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  id: string; // order id

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  type: string; // 'limit' or 'market'

  @ApiProperty()
  side: string; // 'buy' or 'sell'

  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
