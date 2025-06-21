import { ApiProperty } from '@nestjs/swagger';

export class ExchangeCredentialsDto {
  @ApiProperty({ required: false })
  apiKey?: string;
  @ApiProperty({ required: false })
  secret?: string;
  @ApiProperty({ required: false })
  uid?: string;
  @ApiProperty({ required: false })
  login?: string;
  @ApiProperty({ required: false })
  password?: string;
  @ApiProperty({ required: false })
  twofa?: string;
  @ApiProperty({ required: false })
  privateKey?: string;
  @ApiProperty({ required: false })
  walletAddress?: string;
  @ApiProperty({ required: false })
  token?: string;
}
