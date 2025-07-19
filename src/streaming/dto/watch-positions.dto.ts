import { IsOptional, IsString } from 'class-validator';

export class WatchPositionsDto {
  @IsString()
  exchangeId: string;

  @IsOptional()
  @IsString()
  symbol?: string;
}
