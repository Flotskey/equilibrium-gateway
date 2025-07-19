import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchOrdersDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiPropertyOptional()
  symbol?: string;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
