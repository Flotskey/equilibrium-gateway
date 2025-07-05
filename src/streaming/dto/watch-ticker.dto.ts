import { IsString } from 'class-validator';

export class WatchTickerDto {
  @IsString()
  exchangeId: string;

  @IsString()
  symbol: string;
}
