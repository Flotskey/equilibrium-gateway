import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  id: string; // order id

  @ApiPropertyOptional()
  symbol?: string;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
