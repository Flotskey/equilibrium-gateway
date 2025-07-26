export interface CcxtLeverage {
  symbol: string;
  marginMode: 'isolated' | 'cross' | string;
  longLeverage: number;
  shortLeverage: number;
}
