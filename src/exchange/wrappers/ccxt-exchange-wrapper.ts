import * as ccxt from 'ccxt';
import { Exchange } from 'ccxt';
import { CcxtBalance, CcxtMarket, CcxtOrder, CcxtRequiredCredentials } from 'src/models/ccxt';
import { OrderRequestDto } from '../dto/create-orders.dto';
import { ExchangeWrapper } from './exchange-wrapper.interface';

export class CcxtExchangeWrapper implements ExchangeWrapper {
  private exchange: Exchange;

  constructor(exchangeId: string, config: Record<string, any> = {}) {
    const ExchangeInstance = ccxt[exchangeId.toLowerCase()];
    if (!ExchangeInstance) {
      throw new Error(`Exchange '${exchangeId}' is not supported by CCXT`);
    }

    this.exchange = new ExchangeInstance({
      ...config,
      enableRateLimit: true
    });
  }

  get id(): string {
    return this.exchange.id;
  }

  get has(): Record<string, boolean | string> {
    return this.exchange.has;
  }

  get requiredCredentials(): CcxtRequiredCredentials {
    return this.exchange.requiredCredentials;
  }

  async loadMarkets(): Promise<void> {
    await this.exchange.loadMarkets();
  }

  async fetchMarkets(): Promise<CcxtMarket[]> {
    return this.exchange.fetchMarkets() as unknown as CcxtMarket[];
  }

  async createOrder(
    symbol: string,
    type: string,
    side: string,
    amount: number,
    price?: number,
    params?: Record<string, any>
  ): Promise<CcxtOrder> {
    const order = await this.exchange.createOrder(symbol, type, side, amount, price, params);
    return order as CcxtOrder;
  }

  async createOrders(orders: OrderRequestDto[]): Promise<CcxtOrder[]> {
    if (!this.exchange.has['createOrders']) {
      throw new Error(`Exchange '${this.exchange.id}' does not support batch order creation`);
    }
    const createdOrders = await this.exchange.createOrders(orders);
    return createdOrders as CcxtOrder[];
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
    const order = await this.exchange.editOrder(id, symbol, type, side, amount, price, params);
    return order as CcxtOrder;
  }

  async cancelOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<Record<string, any>> {
    return this.exchange.cancelOrder(id, symbol, params);
  }

  async fetchOrder(id: string, symbol?: string, params?: Record<string, any>): Promise<CcxtOrder> {
    const order = await this.exchange.fetchOrder(id, symbol, params);
    return order as CcxtOrder;
  }

  async fetchBalance(params?: Record<string, any>): Promise<CcxtBalance> {
    const balance = await this.exchange.fetchBalance(params);
    return balance as CcxtBalance;
  }

  async close(): Promise<void> {
    if (typeof this.exchange.close === 'function') {
      await this.exchange.close();
    }
  }
}
