import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

export class OrderRequestDto {
  @ApiProperty()
  symbol: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  side: string;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional({ type: Object })
  params?: Record<string, any>;
}

export class CreateOrdersDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty({ type: [OrderRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderRequestDto)
  orders: OrderRequestDto[];
}
