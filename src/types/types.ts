export interface TokenLink {
  type: string;
  url: string;
}

export interface TokenPair {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  openGraph?: string;
  description?: string;
  links?: TokenLink[];
  boosted?: boolean;
}

export interface InterestingToken {
  name: string;
  address: string;
  blockchain: string;
  reason: 'PUMP' | 'RUG' | 'TIER1' | 'CEX_LISTING';
  metrics: {
    priceChangePercent: number;
    volumeChange: number;
    liquidityChange?: number;
    buyVsSellRatio: number;
  };
  timestamp: string;
}
