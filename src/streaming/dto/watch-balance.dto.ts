import { IsString } from 'class-validator';

export class WatchBalanceDto {
  @IsString()
  exchangeId: string;
}
