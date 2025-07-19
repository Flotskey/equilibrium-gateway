import { IsOptional, IsString } from 'class-validator';

export class WatchOrdersDto {
  @IsString()
  exchangeId: string;

  @IsOptional()
  @IsString()
  symbol?: string;
}
