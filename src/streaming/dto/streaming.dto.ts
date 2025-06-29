import { IsArray, IsOptional, IsString } from 'class-validator';

export class StreamingDto {
  @IsString()
  exchangeId: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symbols?: string[];
}
