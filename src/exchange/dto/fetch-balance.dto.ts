import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class FetchBalanceDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;
}
