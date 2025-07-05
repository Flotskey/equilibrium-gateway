import { IsArray, IsString } from 'class-validator';

export class WatchTickersDto {
  @IsString()
  exchangeId: string;

  @IsArray()
  @IsString({ each: true })
  symbols: string[];
}
