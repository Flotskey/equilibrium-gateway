export interface CcxtPosition {
  symbol: string;
  id?: string;
  timestamp?: number;
  datetime?: string;
  contracts?: number;
  contractSize?: number;
  side: 'buy' | 'sell';
  notional?: number;
  leverage?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  collateral?: number;
  entryPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  marginMode?: 'isolated' | 'cross';
  hedged?: boolean;
  maintenanceMargin?: number;
  maintenanceMarginPercentage?: number;
  initialMargin?: number;
  initialMarginPercentage?: number;
  marginRatio?: number;
  lastUpdateTimestamp?: number;
  lastPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  percentage?: number;
}
