export interface CcxtMarginMode {
  symbol: string;
  marginMode: 'isolated' | 'cross';
  [key: string]: any;
}
