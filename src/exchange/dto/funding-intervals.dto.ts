import { ApiPropertyOptional } from '@nestjs/swagger';

export class FundingIntervalsDto {
  @ApiPropertyOptional({ type: Object, description: 'Exchange specific parameters' })
  params?: Record<string, any>;
}
