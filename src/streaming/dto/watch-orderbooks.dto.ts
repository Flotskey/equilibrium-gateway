import { IsArray, IsString } from 'class-validator';

export class WatchOrderBooksDto {
  @IsString()
  exchangeId: string;

  @IsArray()
  @IsString({ each: true })
  symbols: string[];
}
