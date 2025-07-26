import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CcxtFundingRate } from 'src/models/ccxt/ccxt-funding-rate.model';
import { PublicExchangeService } from './public-exchange.service';

export type FundingRatesCache = Record<string, Record<string, CcxtFundingRate>>;

@Injectable()
export class FundingRatesMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FundingRatesMonitorService.name);

  // In-memory singleton object
  private fundingRatesCache: FundingRatesCache = {};

  // Background job interval (in milliseconds) - time BETWEEN cycles
  private readonly UPDATE_INTERVAL = 6000; // 6 seconds between cycles
  private updateTimeout: NodeJS.Timeout | null = null;

  // Batch processing configuration
  private readonly BATCH_SIZE = 6; // Process 4 exchanges in parallel per batch

  // List of exchanges to monitor
  private readonly EXCHANGE_IDS = [
    'ascendex',
    'binance',
    'bingx',
    'bitget',
    'bitmex',
    'bybit',
    'coinex',
    'delta',
    'gate',
    'hashkey',
    'htx',
    'hyperliquid',
    'lbank',
    'modetrade',
    'okx',
    'oxfun',
    'vertex',
    'whitebit',
    'woo',
    'woofipro'
  ];

  constructor(private readonly publicExchangeService: PublicExchangeService) {}

  async onModuleInit() {
    this.logger.log('Starting funding rates monitor service');
    await this.startMonitoring();
  }

  async onModuleDestroy() {
    this.logger.log('Stopping funding rates monitor service');
    this.stopMonitoring();
  }

  /**
   * Start the background monitoring job
   */
  private async startMonitoring(): Promise<void> {
    // Initial fetch
    await this.updateFundingRates();

    // Schedule the next update cycle
    this.scheduleNextUpdate();

    this.logger.log(
      `Funding rates monitoring started. Update interval: ${this.UPDATE_INTERVAL}ms between cycles, Batch size: ${this.BATCH_SIZE}`
    );
  }

  /**
   * Schedule the next update cycle after the current one completes
   */
  private scheduleNextUpdate(): void {
    this.updateTimeout = setTimeout(async () => {
      await this.updateFundingRates();
      this.scheduleNextUpdate(); // Schedule the next cycle after completion
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop the background monitoring job
   */
  private stopMonitoring(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
      this.logger.log('Funding rates monitoring stopped');
    }
  }

  /**
   * Process a single batch of exchanges in parallel
   */
  private async processBatch(exchangeIds: string[]): Promise<void> {
    const batchPromises = exchangeIds.map(async (exchangeId) => {
      try {
        this.logger.log(`Fetching funding rates from ${exchangeId}...`);
        const fundingRates = await this.publicExchangeService.getFundingRates(exchangeId);

        // Update cache for each symbol
        Object.entries(fundingRates).forEach(([symbol, fundingRate]) => {
          if (!this.fundingRatesCache[symbol]) {
            this.fundingRatesCache[symbol] = {};
          }
          this.fundingRatesCache[symbol][exchangeId] = fundingRate;
        });

        this.logger.log(`Updated funding rates for ${exchangeId}: ${Object.keys(fundingRates).length} symbols`);
      } catch (error) {
        this.logger.error(`Failed to fetch funding rates from ${exchangeId}: ${error.message}`, error.stack);
      }
    });

    await Promise.allSettled(batchPromises);
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Fetch funding rates from all exchanges and update the cache
   * Process exchanges in batches for optimal performance and clarity
   */
  private async updateFundingRates(): Promise<void> {
    this.logger.log('Updating funding rates from all exchanges...');

    // Split exchanges into batches
    const batches = this.chunkArray(this.EXCHANGE_IDS, this.BATCH_SIZE);
    this.logger.log(
      `Processing ${this.EXCHANGE_IDS.length} exchanges in ${batches.length} batches of ${this.BATCH_SIZE}`
    );

    // Process each batch sequentially
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.log(`Processing batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);

      await this.processBatch(batch);

      this.logger.log(`Completed batch ${i + 1}/${batches.length}`);
    }

    this.logger.log(`Funding rates update completed. Total symbols: ${Object.keys(this.fundingRatesCache).length}`);
  }

  /**
   * Get the current funding rates cache
   */
  getFundingRatesCache(): FundingRatesCache {
    return this.fundingRatesCache;
  }

  /**
   * Get funding rates for a specific symbol across all exchanges
   */
  getFundingRatesForSymbol(symbol: string): Record<string, CcxtFundingRate> | null {
    return this.fundingRatesCache[symbol] || null;
  }

  /**
   * Get funding rates for a specific exchange
   */
  getFundingRatesForExchange(exchangeId: string): Record<string, CcxtFundingRate> {
    const result: Record<string, CcxtFundingRate> = {};

    Object.entries(this.fundingRatesCache).forEach(([symbol, exchanges]) => {
      if (exchanges[exchangeId]) {
        result[symbol] = exchanges[exchangeId];
      }
    });

    return result;
  }

  /**
   * Get all available symbols
   */
  getAvailableSymbols(): string[] {
    return Object.keys(this.fundingRatesCache);
  }

  /**
   * Get all available exchanges
   */
  getAvailableExchanges(): string[] {
    return this.EXCHANGE_IDS;
  }

  /**
   * Manually trigger an update (useful for testing or immediate refresh)
   */
  async triggerUpdate(): Promise<void> {
    this.logger.log('Manual funding rates update triggered');
    await this.updateFundingRates();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSymbols: number;
    totalExchanges: number;
    lastUpdateTime: Date;
  } {
    return {
      totalSymbols: Object.keys(this.fundingRatesCache).length,
      totalExchanges: this.EXCHANGE_IDS.length,
      lastUpdateTime: new Date()
    };
  }
}
