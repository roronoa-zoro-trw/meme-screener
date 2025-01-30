import axios from 'axios';
import { TokenPair } from '../types/types';

export class DexScreenerAPI {
  private static readonly BASE_URL = 'https://api.dexscreener.com/latest';
  private static readonly DELAY_MS = 1000;

  public async searchPairs(query: string): Promise<TokenPair[]> {
    try {
      const response = await axios.get(`${DexScreenerAPI.BASE_URL}/dex/search/?q=${query}`);
      return response.data.pairs || [];
    } catch (error) {
      console.error('Error fetching pairs:', error);
      return [];
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async getLatestPairs(): Promise<TokenPair[]> {
    try {
      await this.delay(DexScreenerAPI.DELAY_MS);
      
      // Fetch both latest and boosted tokens
      const [latestResponse, boostedResponse] = await Promise.all([
        axios.get('https://api.dexscreener.com/token-profiles/latest/v1'),
        axios.get('https://api.dexscreener.com/token-boosts/latest/v1')
      ]);
      
      if (!latestResponse.data || !Array.isArray(latestResponse.data)) {
        throw new Error('No valid data returned from latest API');
      }

      if (!boostedResponse.data || !Array.isArray(boostedResponse.data)) {
        throw new Error('No valid data returned from boosted API');
      }
      
      // Combine and deduplicate tokens
      const allTokens = [...latestResponse.data, ...boostedResponse.data];
      const uniqueTokens = this.deduplicateTokens(allTokens);
      
      // Filter for supported chains
      const supportedChains = ['solana', 'base'];
      const filteredPairs = uniqueTokens.filter((pair: TokenPair) => 
        supportedChains.includes(pair.chainId.toLowerCase())
      );
      
      console.log(`Found ${filteredPairs.length} pairs in supported chains (including boosted)`);
      return filteredPairs;
    } catch (error) {
      console.error(`Critical error fetching pairs:`, error);
      process.exit(1);
    }
  }

  private deduplicateTokens(tokens: TokenPair[]): TokenPair[] {
    const seen = new Set<string>();
    return tokens.filter(token => {
      const key = `${token.chainId}-${token.tokenAddress}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public async getTokenPairs(chainId: string, tokenAddress: string): Promise<TokenPair[]> {
    try {
      await this.delay(DexScreenerAPI.DELAY_MS);
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      
      if (!response.data || !response.data.pairs) {
        console.log(`No pairs found for token ${tokenAddress}`);
        return [];
      }
      
      // Filter pairs for the specific chain
      const chainPairs = response.data.pairs.filter((pair: any) => 
        pair.chainId.toLowerCase() === chainId.toLowerCase()
      );
      
      console.log(`Found ${chainPairs.length} pairs for token ${tokenAddress} on ${chainId}`);
      return chainPairs;
    } catch (error) {
      console.error(`Error fetching pairs for token ${tokenAddress}:`, error);
      return [];
    }
  }
}
