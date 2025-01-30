# DexScreener Analysis Bot

A TypeScript-based bot that analyzes newly listed and boosted tokens on DexScreener to identify promising opportunities based on various metrics and safety checks.

## Features

- Monitors latest listed tokens on Solana and Base chains
- Analyzes token metrics including:
  - Liquidity ($10k-$200k range)
  - Volume (minimum $500)
  - Price movements
  - Social presence
- Performs safety checks:
  - RugCheck verification for Solana tokens
  - Suspicious activity detection
  - Volume manipulation checks
  - Transaction pattern analysis
- Saves interesting tokens to JSON file
- Colored console output for better readability

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Internet connection for API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dexscreener-analyzer
```

2. Install dependencies:
```bash
bun install
```

## Usage

Run the bot:
```bash
bun run start
```

The bot will:
1. Fetch latest listed tokens from DexScreener
2. Filter for Solana and Base chains
3. Analyze each token's metrics
4. Perform safety checks
5. Save interesting tokens to `data/interesting_tokens.json`

## Configuration

Current thresholds:
- Liquidity: $10,000 - $200,000
- Minimum volume: $500
- Maximum price change: 2000%
- Minimum social score: 1
- Suspicious patterns checked:
  - Liquidity/volume ratio < 0.1
  - High volume with few transactions
  - One-sided trading
  - Extreme price movements

## Token Analysis Criteria

A token is considered interesting if it meets ALL of these criteria:
1. Has liquidity between $10k and $200k
2. 24h volume > $500
3. Price movement > 0% and < 2000%
4. Social score ≥ 1 (based on social media presence)
5. Passes RugCheck verification (Solana only)
6. No suspicious activity patterns

## Output

The bot provides:
- Detailed analysis logs in the console
- Winner announcements with full metrics
- Warnings and error messages in color
- JSON storage of interesting tokens

## Dependencies

- axios: API requests
- axios-retry: Request retry logic
- chalk: Colored console output
- dotenv: Environment configuration

## Project Structure

```
src/
├── analyzers/
│   └── tokenAnalyzer.ts    # Token analysis logic
├── services/
│   ├── dexscreener.ts      # DexScreener API integration
│   └── rugcheck.ts         # RugCheck API integration
├── storage/
│   └── tokenStorage.ts     # Token storage management
├── types/
│   └── types.ts           # TypeScript interfaces
└── index.ts               # Main application entry
```

## Error Handling

- API failures are logged and handled gracefully
- Network issues trigger retries
- Invalid data is filtered out
- Critical errors trigger process exit

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request