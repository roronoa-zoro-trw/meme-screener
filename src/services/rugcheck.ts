import axios from 'axios';
import axiosRetry from 'axios-retry';

export class RugCheckAPI {
  private static readonly BASE_URL = 'https://api.rugcheck.xyz/v1';
  private static readonly DELAY_MS = 1000;

  constructor() {
    axiosRetry(axios, { 
      retries: 3,
      retryDelay: (retryCount) => retryCount * 1000
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async checkToken(chainId: string, tokenAddress: string): Promise<{
    isGood: boolean;
    isBundled: boolean;
    warnings: string[];
  }> {
    try {
      await this.delay(RugCheckAPI.DELAY_MS);
      const response = await axios.get(`${RugCheckAPI.BASE_URL}/tokens/${tokenAddress}/report/summary`);
      
      if (!response.data) {
        throw new Error('No data returned from RugCheck');
      }

      // Check for danger and warning level risks
      const hasDangerRisks = response.data.risks?.some((risk: any) => 
        risk.level === 'danger'
      ) || false;

      const warnings = response.data.risks?.filter((risk: any) => 
        risk.level === 'warn'
      ) || [];

      // Check for high risk score (lower is better in RugCheck)
      const hasHighRiskScore = (response.data.score || 0) > 1000;

      return {
        isGood: !hasDangerRisks && !hasHighRiskScore,
        isBundled: false,
        warnings: warnings.map((w: { name: string }) => w.name)
      };
    } catch (error) {
      console.error(`Error checking token ${tokenAddress} on RugCheck:`, error);
      return {
        isGood: false,
        isBundled: true, // Assume bundled/unsafe if check fails
        warnings: []
      };
    }
  }
}
