import { OrderRequestDto } from 'src/exchange/dto/create-orders.dto';
import { CcxtBalance, CcxtMarket, CcxtOrder, CcxtRequiredCredentials } from 'src/models/ccxt';
import { delay } from 'src/utils/delay';
import { GatewayOrder } from '../../dto/gateway-order.dto';
import { ExchangeWrapper } from '../exchange-wrapper.interface';

export class MockExchangeWrapper implements ExchangeWrapper {
  public mockOrders: GatewayOrder[] = [];
  public mockBalance: CcxtBalance = {
    info: {},
    timestamp: Date.now(),
    datetime: new Date().toISOString(),
    free: {},
    used: {},
    total: {}
  };
  public mockMarkets: CcxtMarket[] = [];

  get id(): string {
    return 'mock';
  }

  get has(): Record<string, boolean | string> {
    return {
      createOrders: true,
      editOrder: true,
      cancelOrder: true
    };
  }

  get requiredCredentials(): CcxtRequiredCredentials {
    return {
      apiKey: true,
      secret: true,
      uid: false,
      login: false,
      password: false,
      twofa: false,
      privateKey: false,
      walletAddress: false,
      token: false
    };
  }

  async loadMarkets(): Promise<void> {
    // Mock implementation with fake delay
    await delay(100);
  }

  async fetchMarkets(): Promise<CcxtMarket[]> {
    // Mock implementation with fake delay
    await delay(100);
    return this.mockMarkets;
  }

  async createOrder(
    symbol: string,
    type: string,
    side: 'buy' | 'sell',
    amount: number,
    price?: number,
    params?: Record<string, any>
  ): Promise<CcxtOrder> {
    const mockOrder: CcxtOrder = {
      id: `order_${Date.now()}`,
      clientOrderId: params?.clientOrderId,
      symbol,
      type,
      side,
      amount,
      price,
      status: 'open',
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      filled: 0,
      remaining: amount,
      cost: 0,
      info: {}
    };

    this.mockOrders.push(mockOrder as any);
    return mockOrder;
  }

  async createOrders(orders: OrderRequestDto[]): Promise<CcxtOrder[]> {
    return Promise.all(
      orders.map((order) =>
        this.createOrder(
          order.symbol,
          order.type,
          order.side as 'buy' | 'sell',
          order.amount,
          order.price,
          order.params
        )
      )
    );
  }

  async editOrder(
    id: string,
    symbol: string,
    type: string,
    side: string,
    amount: number,
    price?: number,
    params?: Record<string, any>
  ): Promise<CcxtOrder> {
    const order = this.mockOrders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');

    order.amount = amount;
    order.price = price;
    return order as unknown as CcxtOrder;
  }

  async cancelOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<Record<string, any>> {
    const order = this.mockOrders.find((o) => o.id === id);
    if (!order) throw new Error('Order not found');

    order.status = 'canceled';
    return { success: true };
  }

  async fetchOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<CcxtOrder> {
    return this.mockOrders.find((o) => o.id === id) as unknown as CcxtOrder;
  }

  async fetchBalance(params?: Record<string, any>): Promise<CcxtBalance> {
    return this.mockBalance;
  }

  async close(): Promise<void> {
    // Mock implementation with fake delay
    await delay(100);
  }
}
