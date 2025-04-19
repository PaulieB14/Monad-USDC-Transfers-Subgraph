# Enhanced USDC Subgraph for Monad Testnet

This subgraph indexes and tracks USDC token data on the Monad testnet, providing comprehensive data about transfers, approvals, balances, and statistics.

## Features

### Token Information
- Basic metadata (name, symbol, decimals)
- Total supply tracking
- Aggregate statistics (transfers, mints, burns, holders)

### Account Tracking
- Real-time balance updates
- Historical balance snapshots
- Transfer and approval activity

### Transaction Data
- Complete transfer history
- Approval tracking
- Role management events

### Aggregated Statistics
- Daily metrics (transfer volume, count, active accounts)
- Mint/burn tracking
- Holder statistics

### Role Management
- Admin role tracking
- Role assignments
- Permission changes

## Schema Overview

### Main Entities

- **Token**: Tracks token metadata and aggregate statistics
- **Account**: Tracks user balances and activity
- **Transfer**: Records all token transfers with relationships
- **Approval**: Records all approval events with relationships
- **DailyMetric**: Aggregates daily statistics
- **Transaction**: Groups related events by transaction
- **AccountBalance**: Historical balance snapshots
- **Role**: Tracks role assignments and permissions

## Queries

### Get Token Information

```graphql
{
  token(id: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea") {
    name
    symbol
    decimals
    totalSupply
    holderCount
    transferCount
    totalTransfers
    totalMints
    totalBurns
  }
}
```

### Get Account Balances and Activity

```graphql
{
  account(id: "0xYourAccountAddress") {
    balance
    transferCount
    approvalCount
    lastUpdated
    transfersFrom {
      to { id }
      value
      blockTimestamp
    }
    transfersTo {
      from { id }
      value
      blockTimestamp
    }
  }
}
```

### Get Daily Statistics

```graphql
{
  dailyMetrics(orderBy: timestamp, orderDirection: desc, first: 7) {
    date
    dailyTransferCount
    dailyTransferVolume
    dailyActiveAccounts
    dailyMintCount
    dailyMintVolume
    dailyBurnCount
    dailyBurnVolume
  }
}
```

### Get Top Token Holders

```graphql
{
  accounts(orderBy: balance, orderDirection: desc, first: 10) {
    id
    balance
  }
}
```

### Get Recent Transfers

```graphql
{
  transfers(orderBy: blockTimestamp, orderDirection: desc, first: 100) {
    from { id }
    to { id }
    value
    blockTimestamp
    isMint
    isBurn
  }
}
```

### Get Mint/Burn Activity

```graphql
{
  # Get mints
  transfers(where: { isMint: true }, orderBy: blockTimestamp, orderDirection: desc) {
    to { id }
    value
    blockTimestamp
  }
  
  # Get burns
  transfers(where: { isBurn: true }, orderBy: blockTimestamp, orderDirection: desc) {
    from { id }
    value
    blockTimestamp
  }
}
```

## Development

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd erc-20-transfers

# Install dependencies
npm install
```

### Building the Subgraph

```bash
# Generate types
npm run codegen

# Build the subgraph
npm run build
```

### Deployment

```bash
# Deploy to local Graph Node
npm run deploy-local

# Deploy to hosted service
npm run deploy
```

## Testing

```bash
# Run tests
npm run test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
