export interface CcxtBalances {
  info: any;
  timestamp: number;
  datetime: string;
  free: { [key: string]: number };
  used: { [key: string]: number };
  total: { [key: string]: number };
  [key: string]: any; // For direct currency access like a.BTC.free
}
