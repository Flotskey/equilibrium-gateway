import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchMarginModeDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  symbol: string;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
