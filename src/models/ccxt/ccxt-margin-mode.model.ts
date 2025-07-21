export interface CcxtMarginMode {
  info: any;
  symbol: string;
  marginMode: 'isolated' | 'cross';
  [key: string]: any;
}
