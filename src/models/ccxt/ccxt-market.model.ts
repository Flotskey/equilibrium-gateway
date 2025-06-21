export interface CcxtMarket {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  baseId: string;
  quoteId: string;
  active: boolean;
  type: 'spot' | 'margin' | 'swap' | 'future' | 'option' | string;
  spot: boolean;
  margin: boolean;
  swap: boolean;
  future: boolean;
  option: boolean;
  contract: boolean;
  settle?: string;
  settleId?: string;
  contractSize?: number;
  linear?: boolean;
  inverse?: boolean;
  expiry?: number;
  expiryDatetime?: string;
  strike?: number;
  optionType?: 'call' | 'put';
  taker: number;
  maker: number;
  percentage?: boolean;
  tierBased?: boolean;
  feeSide?: 'get' | 'give' | 'base' | 'quote' | 'other';
  precision: {
    price: number;
    amount: number;
    cost?: number;
  };
  limits: {
    amount: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
    leverage?: { min?: number; max?: number };
  };
  info: Record<string, any>;
}
