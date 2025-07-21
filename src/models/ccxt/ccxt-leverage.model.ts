export interface CcxtLeverage {
  info: any;
  symbol: string;
  marginMode: 'isolated' | 'cross' | string;
  longLeverage: number;
  shortLeverage: number;
}
