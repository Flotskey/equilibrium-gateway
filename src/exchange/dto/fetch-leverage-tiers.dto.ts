import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchLeverageTiersDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiPropertyOptional()
  symbols?: string[];

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>; // exchange-specific params
}
