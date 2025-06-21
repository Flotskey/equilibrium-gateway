import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class RemoveConnectionDto {
  @ApiHideProperty()
  userId?: string;

  @ApiProperty()
  exchangeId: string;
}
