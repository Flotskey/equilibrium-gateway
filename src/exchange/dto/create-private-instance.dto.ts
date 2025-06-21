import { ApiProperty } from '@nestjs/swagger';
import { ExchangeCredentialsDto } from './exchange-credentials.dto';

export class CreatePrivateInstanceDto {
  @ApiProperty()
  userId: string;
  @ApiProperty()
  exchangeId: string;
  @ApiProperty()
  creds: ExchangeCredentialsDto;
}
