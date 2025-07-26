import { ApiProperty } from '@nestjs/swagger';

export class CacheStatsDto {
  @ApiProperty({ description: 'Total number of symbols in cache' })
  totalSymbols: number;

  @ApiProperty({ description: 'Total number of exchanges being monitored' })
  totalExchanges: number;

  @ApiProperty({ description: 'Last update time' })
  lastUpdateTime: Date;
}
