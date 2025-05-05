# USDC Factory Subgraph for Monad Testnet

This subgraph indexes and tracks a USDC token factory contract and all tokens created through it on the Monad testnet. It provides comprehensive data about token creation, transfers, approvals, balances, and statistics.

## Features

### Factory Tracking
- Token creation events
- Count of tokens created through the factory
- Relationships between factory and tokens

### Token Information
- Basic metadata (name, symbol, decimals)
- Total supply tracking
- Aggregate statistics (transfers, mints, burns, holders)
- Creation details (timestamp, block number, creator)

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

- **USDCFactory**: Tracks the factory contract that creates new tokens
- **Token**: Tracks token metadata and aggregate statistics for each created token
- **Account**: Tracks user balances and activity
- **Transfer**: Records all token transfers with relationships
- **Approval**: Records all approval events with relationships
- **DailyMetric**: Aggregates daily statistics
- **Transaction**: Groups related events by transaction
- **AccountBalance**: Historical balance snapshots
- **Role**: Tracks role assignments and permissions

## Queries

### Get Factory Information

```graphql
{
  usdcFactory(id: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea") {
    id
    tokenCount
    tokens {
      id
      name
      symbol
      decimals
      totalSupply
      creator
      createdAtTimestamp
    }
  }
}
```

### Get Token Information

```graphql
{
  token(id: "0xTokenAddress") {
    name
    symbol
    decimals
    totalSupply
    holderCount
    transferCount
    totalTransfers
    totalMints
    totalBurns
    factory {
      id
    }
    creator
    createdAtTimestamp
    createdAtBlockNumber
  }
}
```

### Get Account Balances and Activity

```graphql
{
  account(id: "0xYourAccountAddress-0xTokenAddress") {
    balance
    transferCount
    approvalCount
    lastUpdated
    token {
      name
      symbol
    }
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

### Get Daily Statistics for a Token

```graphql
{
  dailyMetrics(
    where: { token: "0xTokenAddress" }
    orderBy: timestamp
    orderDirection: desc
    first: 7
  ) {
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

### Get Top Token Holders for a Specific Token

```graphql
{
  accounts(
    where: { token: "0xTokenAddress" }
    orderBy: balance
    orderDirection: desc
    first: 10
  ) {
    id
    balance
  }
}
```

### Get Recent Transfers for a Specific Token

```graphql
{
  transfers(
    where: { token: "0xTokenAddress" }
    orderBy: blockTimestamp
    orderDirection: desc
    first: 100
  ) {
    from { id }
    to { id }
    value
    blockTimestamp
    isMint
    isBurn
  }
}
```

### Get Recent Mint Transfers for a Specific Token

```graphql
query GetRecentMintTransfers {
  transfers(
    where: { token: "0xTokenAddress", isMint: true }
    orderBy: blockTimestamp
    orderDirection: desc
  ) {
    id
    to { id }
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
cd Monad-USDC-Transfers-Subgraph

# Install dependencies
npm install
```

### Configuration

Before deploying the subgraph, you need to:

1. Replace `"0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"` in `subgraph.yaml` and `networks.json` with your actual factory contract address
2. Update the start block if needed (currently set to block 15000000)

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
