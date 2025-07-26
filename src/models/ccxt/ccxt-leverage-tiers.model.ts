export interface CcxtLeverageTier {
  tier: number;
  currency: string;
  minNotional: number;
  maxNotional: number;
  maintenanceMarginRate: number;
  maxLeverage: number;
}
