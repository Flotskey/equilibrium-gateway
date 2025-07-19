export interface CcxtFee {
  currency: string;
  cost: number;
  rate?: number;
}

export interface CcxtTrade {
  info: any;
  amount: number;
  datetime: number;
  id: string;
  order: string;
  price: number;
  timestamp: number;
  type: string;
  side: 'buy' | 'sell' | string;
  symbol: string;
  takerOrMaker: 'taker' | 'maker' | string;
  cost: number;
  fee: CcxtFee;
}

export interface CcxtOrder {
  id: string;
  clientOrderId?: string;
  datetime: string;
  timestamp: number;
  lastTradeTimestamp?: number;
  status: 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';
  symbol: string;
  type: 'market' | 'limit' | string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PO';
  side: 'buy' | 'sell';
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  trades?: CcxtTrade[];
  fee?: CcxtFee;
  info: any;
}
