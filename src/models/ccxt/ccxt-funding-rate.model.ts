export interface CcxtFundingRate {
  symbol: string;
  timestamp?: number;
  fundingRate?: number;
  datetime?: string;
  markPrice?: number;
  indexPrice?: number;
  interestRate?: number;
  estimatedSettlePrice?: number;
  fundingTimestamp?: number;
  fundingDatetime?: string;
  nextFundingTimestamp?: number;
  nextFundingDatetime?: string;
  nextFundingRate?: number;
  previousFundingTimestamp?: number;
  previousFundingDatetime?: string;
  previousFundingRate?: number;
  interval?: string;
}
