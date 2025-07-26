# Funding Rates Monitor

This feature provides real-time monitoring of funding rates across multiple exchanges and identifies arbitrage opportunities.

## Overview

The Funding Rates Monitor runs a background job that:

- Fetches funding rates from all configured exchanges every minute
- Maintains an in-memory cache of all funding rates
- Provides REST endpoints to access the data

## Configuration

### 1. Add Exchange IDs

Edit `src/exchange/funding-rates-monitor.service.ts` and add your exchange IDs to the `EXCHANGE_IDS` array:

```typescript
private readonly EXCHANGE_IDS: string[] = [
  'binance',
  'bybit',
  'okx',
  'kucoin',
  // Add more exchanges as needed
];
```

### 2. Update Interval (Optional)

You can modify the update interval by changing the `UPDATE_INTERVAL` value (default: 60000ms = 1 minute):

```typescript
private readonly UPDATE_INTERVAL = 30000; // 30 seconds
```

## API Endpoints

### Get Complete Cache

```
GET /funding-rates-monitor/cache
```

Returns the complete funding rates cache for all symbols and exchanges.

### Get Funding Rates for Symbol

```
GET /funding-rates-monitor/symbol/{symbol}
```

Returns funding rates for a specific symbol across all exchanges.

### Get Funding Rates for Exchange

```
GET /funding-rates-monitor/exchange/{exchangeId}
```

Returns funding rates for a specific exchange across all symbols.

### Get Available Symbols

```
GET /funding-rates-monitor/symbols
```

Returns all available symbols in the cache.

### Get Available Exchanges

```
GET /funding-rates-monitor/exchanges
```

Returns all available exchanges being monitored.

### Get Cache Statistics

```
GET /funding-rates-monitor/stats
```

Returns cache statistics including total symbols, exchanges, and last update time.

### Manual Update

```
POST /funding-rates-monitor/update
```

Manually triggers a funding rates update.

## Data Structure

The funding rates cache has the following structure:

```typescript
{
  "BTC/USDT": {
    "binance": {
      "fundingRate": 0.000072,
      "timestamp": 1234567890,
      "datetime": "2024-01-01T00:00:00.000Z",
      // ... other CCXT funding rate fields
    },
    "bybit": {
      "fundingRate": 0.000061,
      "timestamp": 1234567890,
      // ... other fields
    }
  },
  "ETH/USDT": {
    // ... similar structure
  }
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get complete cache
const cache = await fetch('/funding-rates-monitor/cache');
const cacheData = await cache.json();

// Get specific symbol data
const btcRates = await fetch('/funding-rates-monitor/symbol/BTC%2FUSDT');
const btcData = await btcRates.json();

// Get data for specific exchange
const binanceRates = await fetch('/funding-rates-monitor/exchange/binance');
const binanceData = await binanceRates.json();
```

### Monitoring Cache Health

```javascript
// Check cache statistics
const stats = await fetch('/funding-rates-monitor/stats');
const cacheStats = await stats.json();

console.log(`Monitoring ${cacheStats.totalExchanges} exchanges`);
console.log(`Tracking ${cacheStats.totalSymbols} symbols`);
console.log(`Last update: ${cacheStats.lastUpdateTime}`);
```

## Error Handling

The system is designed to be resilient:

- If an exchange fails to respond, other exchanges continue to be monitored
- Failed exchanges are logged but don't stop the monitoring process
- The cache retains the last known good data for failed exchanges
- Manual updates can be triggered if needed

## Performance Considerations

- The cache is stored in memory for fast access
- Updates happen in parallel across all exchanges
- The system uses `Promise.allSettled()` to handle partial failures
- Consider adjusting the update interval based on your needs and exchange rate limits
