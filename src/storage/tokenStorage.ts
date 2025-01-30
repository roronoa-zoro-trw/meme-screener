import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { InterestingToken } from '../types/types';

export class TokenStorage {
  private filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, '../../data/interesting_tokens.json');
    this.initializeStorage();
  }

  private initializeStorage(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  public saveToken(token: InterestingToken): void {
    const tokens = this.getTokens();
    const exists = tokens.some(t => 
      t.address === token.address && 
      t.blockchain === token.blockchain
    );

    if (!exists) {
      tokens.push(token);
      fs.writeFileSync(this.filePath, JSON.stringify(tokens, null, 2));
      console.log('\n' + chalk.bgGreen.black(' 🏆 WINNER FOUND ') + '\n');
      console.log(chalk.yellow('┌────────────────────────────────────────'));
      console.log(chalk.yellow('│ ') + chalk.blue('Name: ') + chalk.white(token.name));
      console.log(chalk.yellow('│ ') + chalk.blue('Address: ') + chalk.white(token.address));
      console.log(chalk.yellow('│ ') + chalk.blue('Chain: ') + chalk.white(token.blockchain));
      console.log(chalk.yellow('│ ') + chalk.blue('Reason: ') + chalk.white(token.reason));
      console.log(chalk.yellow('│'));
      console.log(chalk.yellow('│ ') + chalk.blue('Metrics:'));
      console.log(chalk.yellow('│ ') + chalk.gray('├─') + chalk.blue(' Price Change: ') + chalk.white(`${token.metrics.priceChangePercent}%`));
      console.log(chalk.yellow('│ ') + chalk.gray('├─') + chalk.blue(' Volume: ') + chalk.white(`$${token.metrics.volumeChange}`));
      console.log(chalk.yellow('│ ') + chalk.gray('├─') + chalk.blue(' Liquidity: ') + chalk.white(`$${token.metrics.liquidityChange}`));
      console.log(chalk.yellow('│ ') + chalk.gray('└─') + chalk.blue(' Social Score: ') + chalk.white(token.metrics.buyVsSellRatio));
      console.log(chalk.yellow('└────────────────────────────────────────\n'));
    }
  }

  public getTokens(): InterestingToken[] {
    const content = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content);
  }
}
