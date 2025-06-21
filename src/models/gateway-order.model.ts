import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatewayOrder {
  @ApiProperty({ description: 'The unique identifier for the order.' })
  id: string;

  @ApiPropertyOptional({ description: 'A client-defined order identifier.' })
  clientOrderId?: string;

  @ApiProperty({ description: 'The ISO 8601 datetime string of when the order was created.' })
  datetime: string;

  @ApiProperty({ description: 'The timestamp of when the order was created (in milliseconds).' })
  timestamp: number;

  @ApiProperty({ description: 'The current status of the order (e.g., "open", "closed", "canceled").' })
  status: string;

  @ApiProperty({ description: 'The market symbol for the order (e.g., "BTC/USDT").' })
  symbol: string;

  @ApiProperty({ description: 'The type of order (e.g., "limit", "market").' })
  type: string;

  @ApiProperty({ description: 'The side of the order ("buy" or "sell").' })
  side: string;

  @ApiProperty({ description: 'The price at which the order was placed.' })
  price: number;

  @ApiProperty({ description: 'The total amount of the order.' })
  amount: number;

  @ApiProperty({ description: 'The amount of the order that has been filled.' })
  filled: number;

  @ApiProperty({ description: 'The remaining amount of the order to be filled.' })
  remaining: number;

  @ApiProperty({ description: 'The total cost of the filled portion of the order.' })
  cost: number;

  @ApiPropertyOptional({
    description: 'Fee details for the order.',
    type: 'object',
    properties: {
      currency: { type: 'string' },
      cost: { type: 'number' },
      rate: { type: 'number' }
    }
  })
  fee?: {
    currency?: string;
    cost?: number;
    rate?: number;
  };
}
