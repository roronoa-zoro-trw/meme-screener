import { DexScreenerAPI } from './services/dexscreener';
import { TokenAnalyzer } from './analyzers/tokenAnalyzer';
import { TokenStorage } from './storage/tokenStorage';
import chalk from 'chalk';

class DexScreenerBot {
  private dexScreener: DexScreenerAPI;
  private analyzer: TokenAnalyzer;
  private storage: TokenStorage;

  constructor() {
    this.dexScreener = new DexScreenerAPI();
    this.analyzer = new TokenAnalyzer();
    this.storage = new TokenStorage();
  }

  public async start(): Promise<void> {
    console.log(chalk.bgBlue.white('\n 🤖 DexScreener Bot Started \n'));
    await this.analyzeAllChains();
    console.log('Analysis complete. Exiting...');
    process.exit(0);
  }

  private async analyzeAllChains(): Promise<void> {
    try {
      console.log('Fetching latest listed tokens...');
      const latestTokens = await this.dexScreener.getLatestPairs();
      
      // Group tokens by chain
      const solanaTokens = latestTokens.filter(t => t.chainId.toLowerCase() === 'solana');
      const baseTokens = latestTokens.filter(t => t.chainId.toLowerCase() === 'base');

      // Get the most recent token from each chain
      const tokensToAnalyze = [
        solanaTokens[0],
        baseTokens[0]
      ].filter(Boolean); // Remove undefined entries if no tokens found for a chain

      console.log(`Found tokens to analyze: ${tokensToAnalyze.length}`);

      let winnersFound = 0;
      for (const token of tokensToAnalyze) {
        try {
          console.log(`Analyzing ${token.chainId} token: ${token.tokenAddress}`);
          
          // Get detailed pool data for the token
          const poolData = await this.dexScreener.getTokenPairs(token.chainId, token.tokenAddress);
          
          if (poolData.length > 0) {
            const result = await this.analyzer.analyzeToken(token, poolData);
            if (result) {
              this.storage.saveToken(result);
            }
          } else {
            console.log(`No pool data found for ${token.tokenAddress}`);
              winnersFound++;
          }
        } catch (error) {
          console.error(`Error analyzing token ${token.tokenAddress}:`, error);
        }
      }

      if (winnersFound === 0) {
        console.log('❌ No winners found in this run');
      }
    } catch (error) {
      console.error('Critical error in analysis:', error);
      process.exit(1);
    }
  }
}

// Start the bot
const bot = new DexScreenerBot();
bot.start().catch(console.error);
