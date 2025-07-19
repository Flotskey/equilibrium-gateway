import { IsOptional, IsString } from 'class-validator';

export class WatchMyTradesDto {
  @IsString()
  exchangeId: string;

  @IsOptional()
  @IsString()
  symbol?: string;
}
