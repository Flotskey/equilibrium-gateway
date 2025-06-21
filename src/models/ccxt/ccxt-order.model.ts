import { Trade } from 'ccxt';

export interface CcxtFee {
  currency: string;
  cost: number;
  rate?: number;
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
  trades?: Trade[];
  fee?: CcxtFee;
  info: any;
}
