import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { ExchangeCredentialsDto } from './exchange-credentials.dto';

export class CreateConnectionDto {
  @ApiHideProperty()
  userId: string;

  @ApiProperty()
  exchangeId: string;

  @ApiProperty()
  credentials: ExchangeCredentialsDto;
}
