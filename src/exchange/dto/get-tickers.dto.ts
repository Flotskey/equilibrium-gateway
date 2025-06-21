import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetTickersDto {
  @ApiPropertyOptional({ type: [String] })
  symbols: string[];
}

export class GetBidsAsksDto {
  @ApiPropertyOptional({ type: [String] })
  symbols: string[];
}
