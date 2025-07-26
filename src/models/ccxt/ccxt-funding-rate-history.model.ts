export interface CcxtFundingRateHistory {
  symbol: string;
  timestamp: number;
  datetime: string;
  fundingRate: number;
  fundingDatetime: string;
  fundingTimestamp: number;
  [key: string]: any;
}
