import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class SetLeverageDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty({ description: 'The leverage value to set', minimum: 1 })
  @IsNumber()
  @Min(1)
  leverage: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  params?: Record<string, any>; // exchange-specific params
}
