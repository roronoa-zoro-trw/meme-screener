import { TokenPair, InterestingToken } from '../types/types';
import { RugCheckAPI } from '../services/rugcheck';
import chalk from 'chalk';

export class TokenAnalyzer {
  private rugCheck: RugCheckAPI;

  constructor() {
    this.rugCheck = new RugCheckAPI();
  }

  public async analyzeToken(token: TokenPair, poolData: any[]): Promise<InterestingToken | null> {
    // Basic validation
    if (!token.tokenAddress) {
      console.log(`Skipping token - missing token address`);
      return null;
    }

    const socialScore = this.calculateSocialScore(token);
    const hasValidDescription = token.description ? this.validateDescription(token.description) : true;
    
    // Analyze pool data
    if (poolData.length === 0) {
      console.log(`No pool data available for ${token.tokenAddress}`);
      return null;
    }

    // Sort pools by liquidity to get the main pool
    const sortedPools = poolData.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    );
    
    const mainPool = sortedPools[0];

    const poolMetrics = {
      priceChangePercent: mainPool.priceChange?.h24 || 0,
      volumeChange: mainPool.volume?.h24 || 0,
      liquidityChange: mainPool.liquidity?.usd || 0
    };

    // Check Solana tokens on RugCheck
    if (token.chainId.toLowerCase() === 'solana') {
      console.log(`Running RugCheck for Solana token ${token.tokenAddress}...`);
      const rugCheckResult = await this.rugCheck.checkToken(token.chainId, token.tokenAddress);
      
      if (!rugCheckResult.isGood) {
        console.log(chalk.bgRed.white(' ❌ FAILED ') + chalk.red(` Solana token ${token.tokenAddress} failed RugCheck verification or has danger flags`));
        return null;
      }

      if (rugCheckResult.isBundled) {
        console.log(`❌ Solana token ${token.tokenAddress} has bundled supply - blacklisted`);
        return null;
      }

      if (rugCheckResult.warnings.length > 0) {
        console.log(chalk.bgYellow.black(' ⚠️ WARNING ') + chalk.yellow(` Solana token ${token.tokenAddress} passed RugCheck with warnings:`));
        rugCheckResult.warnings.forEach(warning => console.log(chalk.yellow(`  ▸ ${warning}`)));
      } else {
        console.log(chalk.bgGreen.black(' ✅ PASSED ') + chalk.green(` Solana token ${token.tokenAddress} passed RugCheck verification`));
      }
    }

    // Check for potential fake volume and rug pull signals
    const isSuspicious = this.checkForSuspiciousActivity(mainPool);
    if (isSuspicious) {
      console.log(`Suspicious activity detected for ${token.tokenAddress}`);
      return null;
    }

    // Calculate metrics with minimum liquidity requirement
    const minLiquidityRequirement = 10000; // Minimum $10k liquidity
    const maxLiquidityRequirement = 200000; // Maximum $200k liquidity
    const hasEnoughLiquidity = poolMetrics.liquidityChange >= minLiquidityRequirement && poolMetrics.liquidityChange <= maxLiquidityRequirement;
    const hasVolume = poolMetrics.volumeChange >= 500; // Keep minimum volume at $500
    const hasPriceMovement = Math.abs(poolMetrics.priceChangePercent) > 0;
    const hasReasonablePriceChange = Math.abs(poolMetrics.priceChangePercent) < 2000; // Allow up to 2000% change

    // Log detailed metrics and conditions
    console.log(chalk.cyan('\nDetailed Token Analysis:'));
    console.log(chalk.yellow('Liquidity Check:'));
    console.log(`- Current: $${poolMetrics.liquidityChange}`);
    console.log(`- Required: Between $${minLiquidityRequirement} and $${maxLiquidityRequirement}`);
    console.log(`- Status: ${hasEnoughLiquidity ? chalk.green('PASSED') : chalk.red('FAILED')}`);

    console.log(chalk.yellow('\nVolume Check:'));
    console.log(`- Current: $${poolMetrics.volumeChange}`);
    console.log(`- Required: $500`);
    console.log(`- Status: ${hasVolume ? chalk.green('PASSED') : chalk.red('FAILED')}`);

    console.log(chalk.yellow('\nPrice Movement Check:'));
    console.log(`- Current: ${poolMetrics.priceChangePercent}%`);
    console.log(`- Required: Between 0% and 2000%`);
    console.log(`- Status: ${(hasPriceMovement && hasReasonablePriceChange) ? chalk.green('PASSED') : chalk.red('FAILED')}`);

    console.log(chalk.yellow('\nSocial Score Check:'));
    console.log(`- Current: ${socialScore}`);
    console.log(`- Required: >= 1`);
    console.log(`- Status: ${(socialScore >= 1) ? chalk.green('PASSED') : chalk.red('FAILED')}`);

    // More lenient conditions with better logging
    if (hasEnoughLiquidity && hasVolume && hasPriceMovement && hasReasonablePriceChange && 
        socialScore >= 1) {
        console.log(chalk.green('\n✨ All conditions met! Token qualifies as a winner!\n'));
      return this.createInterestingToken(token, 'TIER1', socialScore, poolMetrics);
    }

    return null;
  }

  private calculateSocialScore(pair: TokenPair): number {
    let score = 0;
    
    if (pair.links && Array.isArray(pair.links)) {
      // Count unique social platforms
      const platforms = new Set(pair.links.map(link => link.type));
      score += platforms.size;
      
      // Bonus for having both Twitter and Telegram
      if (platforms.has('twitter') && platforms.has('telegram')) {
        score += 1;
      }
    }

    // Bonus for having icon and header images
    if (pair.icon) score += 0.5;
    if (pair.header) score += 0.5;

    return score;
  }

  private checkForSuspiciousActivity(pool: any): boolean {
    // Check for suspicious patterns
    
    // 1. Extremely low liquidity compared to volume
    const liquidityToVolumeRatio = (pool.liquidity?.usd || 0) / (pool.volume?.h24 || 1);
    if (liquidityToVolumeRatio < 0.1) { // Less than 10% liquidity/volume ratio
      console.log('Suspicious: Very low liquidity compared to volume');
      return true;
    }

    // 2. Unusual transaction patterns
    const txns = pool.txns?.h24 || { buys: 0, sells: 0 };
    const totalTxns = txns.buys + txns.sells;
    
    // Too few transactions with high volume
    if (totalTxns < 10 && (pool.volume?.h24 || 0) > 10000) {
      console.log('Suspicious: High volume with very few transactions');
      return true;
    }

    // One-sided trading (mostly buys or mostly sells)
    if (totalTxns > 10) {
      const buyRatio = txns.buys / totalTxns;
      if (buyRatio > 0.95 || buyRatio < 0.05) {
        console.log('Suspicious: Extremely one-sided trading');
        return true;
      }
    }

    // 3. Price manipulation check
    const priceChange = Math.abs(pool.priceChange?.h24 || 0);
    if (priceChange > 1000) { // More than 1000% price change
      console.log('Suspicious: Extreme price movement');
      return true;
    }

    return false;
  }

  private validateDescription(description: string): boolean {
    // Check if description is meaningful (not too short, contains relevant keywords)
    const minLength = 30;
    const keywords = ['token', 'crypto', 'defi', 'blockchain', 'protocol', 'platform'];
    
    if (description.length < minLength) return false;
    
    return keywords.some(keyword => 
      description.toLowerCase().includes(keyword)
    );
  }

  private createInterestingToken(
    token: TokenPair,
    reason: InterestingToken['reason'],
    socialScore: number,
    poolMetrics: { priceChangePercent: number; volumeChange: number; liquidityChange: number }
  ): InterestingToken {
    const name = token.description?.split(' ')[0] || 
                 token.url.split('/').pop() || 
                 'Unknown Token';
    
    return {
      name,
      address: token.tokenAddress,
      blockchain: token.chainId,
      reason,
      metrics: {
        priceChangePercent: poolMetrics.priceChangePercent,
        volumeChange: poolMetrics.volumeChange,
        liquidityChange: poolMetrics.liquidityChange,
        buyVsSellRatio: socialScore
      },
      timestamp: new Date().toISOString()
    };
  }
}
