import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class SetMarginModeDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty({ enum: ['isolated', 'cross'], description: 'The margin mode to set' })
  @IsEnum(['isolated', 'cross'])
  marginMode: 'isolated' | 'cross';

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  params?: Record<string, any>; // exchange-specific params
}
