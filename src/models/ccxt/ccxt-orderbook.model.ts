export interface CcxtOrderBook {
  symbol: string;
  timestamp: number;
  datetime: string;
  nonce?: number;
  bids: [number, number][];
  asks: [number, number][];
  info: Record<string, any>;
}
