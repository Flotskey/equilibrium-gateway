import { CcxtBalance, CcxtMarket, CcxtOrder, CcxtRequiredCredentials } from 'src/models/ccxt';
import { OrderRequestDto } from '../dto/create-orders.dto';

export interface ExchangeWrapper {
  // Market operations
  loadMarkets(): Promise<void>;
  fetchMarkets(): Promise<CcxtMarket[]>;

  // Order operations
  createOrder(
    symbol: string,
    type: string,
    side: string,
    amount: number,
    price?: number,
    params?: Record<string, any>
  ): Promise<CcxtOrder>;
  createOrders(orders: OrderRequestDto[]): Promise<CcxtOrder[]>;
  editOrder(
    id: string,
    symbol: string,
    type: string,
    side: string,
    amount: number,
    price?: number,
    params?: Record<string, any>
  ): Promise<CcxtOrder>;
  cancelOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<Record<string, any>>;
  fetchOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<CcxtOrder>;

  // Account operations
  fetchBalance(params?: Record<string, any>): Promise<CcxtBalance>;

  // Exchange info
  readonly id: string;
  readonly has: Record<string, boolean | string>;
  readonly requiredCredentials: CcxtRequiredCredentials;

  // Connection management
  close(): Promise<void>;
}
