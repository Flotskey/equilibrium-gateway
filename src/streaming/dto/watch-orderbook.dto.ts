import { IsString } from 'class-validator';

export class WatchOrderBookDto {
  @IsString()
  exchangeId: string;

  @IsString()
  symbol: string;
}
