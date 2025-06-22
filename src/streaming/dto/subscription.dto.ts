import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubscriptionDto {
  @ApiProperty({
    description: 'The ID of the exchange to subscribe to (e.g., "binance").',
    example: 'binance'
  })
  @IsString()
  @IsNotEmpty()
  exchangeId: string;

  @ApiProperty({
    description: 'An array of market symbols to subscribe to.',
    example: ['BTC/USDT', 'ETH/USDT']
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  symbols: string[];
}
