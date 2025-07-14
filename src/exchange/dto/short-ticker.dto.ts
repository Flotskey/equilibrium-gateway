import { ApiProperty } from '@nestjs/swagger';

export class ShortTickerDto {
  @ApiProperty({ description: 'The market symbol (e.g., BTC/USDT).' })
  symbol: string;

  @ApiProperty({ description: 'The last traded price.' })
  last: number;

  @ApiProperty({ description: 'The price change since the previous close.' })
  change: number;

  @ApiProperty({ description: 'The highest price in the last 24 hours.' })
  high: number;

  @ApiProperty({ description: 'The lowest price in the last 24 hours.' })
  low: number;
}
