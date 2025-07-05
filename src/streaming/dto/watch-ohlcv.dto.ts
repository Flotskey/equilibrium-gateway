import { IsString, Matches } from 'class-validator';

export class WatchOhlcvDto {
  @IsString()
  exchangeId: string;

  @IsString()
  symbol: string;

  @IsString()
  @Matches(/^\d+(m|h|d|w|M|y|s)$/, { message: 'timeframe must be a valid string like 1m, 5m, 1h, 1d, 1w, 1M, 1y, 30s' })
  timeframe: string;
}
