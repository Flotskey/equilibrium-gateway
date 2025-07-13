import { ApiProperty } from '@nestjs/swagger';

export class ShortTickerDto {
  @ApiProperty({ description: 'The market symbol (e.g., BTC/USDT).' })
  symbol: string;

  @ApiProperty({ description: 'The last traded price.' })
  last: number;

  @ApiProperty({ description: 'The price change since the previous close.' })
  change: number;
}
