import { ApiProperty } from '@nestjs/swagger';

export class ShortMarketDto {
  @ApiProperty({ description: 'The market symbol (e.g., BTC/USDT).' })
  symbol: string;

  @ApiProperty({ description: 'Whether the market is active.' })
  active: boolean;
}
