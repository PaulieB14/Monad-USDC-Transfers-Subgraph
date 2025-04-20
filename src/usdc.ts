import {
  Approval as ApprovalEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  Transfer as TransferEvent,
  USDC
} from "../generated/USDC/USDC"
import {
  Approval,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Transfer,
  Token,
  Account,
  DailyMetric,
  Transaction,
  AccountBalance,
  Role
} from "../generated/schema"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"

// Constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)

// Helper functions
function fetchToken(address: Address): Token {
  let tokenId = address.toHexString()
  let token = Token.load(tokenId)
  
  if (token == null) {
    token = new Token(tokenId)
    
    // Hardcode token metadata to avoid RPC calls that might fail
    token.name = "USD Coin"
    token.symbol = "USDC"
    token.decimals = 6
    
    token.totalSupply = ZERO_BI
    token.totalTransfers = ZERO_BI
    token.totalMints = ZERO_BI
    token.totalBurns = ZERO_BI
    token.holderCount = ZERO_BI
    token.transferCount = ZERO_BI
    token.approvalCount = ZERO_BI
    
    token.save()
  }
  
  return token as Token
}

function fetchAccount(address: Address, tokenAddress: Address): Account {
  let accountId = address.toHexString()
  let account = Account.load(accountId)
  
  if (account == null) {
    account = new Account(accountId)
    account.balance = ZERO_BI
    account.transferCount = ZERO_BI
    account.approvalCount = ZERO_BI
    account.lastUpdated = ZERO_BI
    account.token = tokenAddress.toHexString()
    
    // If this is a new account, increment holder count
    let token = fetchToken(tokenAddress)
    token.holderCount = token.holderCount.plus(ONE_BI)
    token.save()
  }
  
  return account as Account
}

function fetchTransaction(event: ethereum.Event): Transaction {
  let txHash = event.transaction.hash.toHexString()
  let transaction = Transaction.load(txHash)
  
  if (transaction == null) {
    transaction = new Transaction(txHash)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.save()
  }
  
  return transaction as Transaction
}

// Function to convert timestamp to YYYY-MM-DD format
function formatDateFromTimestamp(timestamp: BigInt): string {
  // Convert seconds to milliseconds and create a Date object
  let date = new Date(timestamp.toI32() * 1000)
  
  let year = date.getUTCFullYear()
  let month = ('0' + (date.getUTCMonth() + 1)).slice(-2) // Add leading zero if needed
  let day = ('0' + date.getUTCDate()).slice(-2) // Add leading zero if needed
  
  return year.toString() + '-' + month + '-' + day
}

function fetchDailyMetric(tokenAddress: Address, timestamp: BigInt): DailyMetric {
  // Timestamp rounded to the day (86400 seconds in a day)
  let dayID = timestamp.div(BigInt.fromI32(86400)).toString()
  let tokenId = tokenAddress.toHexString()
  let id = tokenId + "-" + dayID
  
  let metric = DailyMetric.load(id)
  if (metric == null) {
    metric = new DailyMetric(id)
    metric.date = formatDateFromTimestamp(timestamp) // Store as YYYY-MM-DD format
    metric.timestamp = timestamp
    metric.dailyTransferCount = ZERO_BI
    metric.dailyTransferVolume = ZERO_BI
    metric.dailyActiveAccounts = ZERO_BI
    metric.dailyMintCount = ZERO_BI
    metric.dailyMintVolume = ZERO_BI
    metric.dailyBurnCount = ZERO_BI
    metric.dailyBurnVolume = ZERO_BI
    metric.token = tokenId
    metric.save()
  }
  
  return metric as DailyMetric
}

function createAccountBalance(account: Account, token: Token, value: BigInt, event: ethereum.Event): void {
  let id = account.id + "-" + event.block.number.toString()
  let balance = new AccountBalance(id)
  balance.account = account.id
  balance.token = token.id
  balance.value = value
  balance.blockNumber = event.block.number
  balance.timestamp = event.block.timestamp
  balance.save()
}

function fetchRole(roleBytes: Bytes): Role {
  let roleId = roleBytes.toHexString()
  let role = Role.load(roleId)
  
  if (role == null) {
    role = new Role(roleId)
    
    // Try to identify known roles
    if (roleBytes.toHexString() == "0x0000000000000000000000000000000000000000000000000000000000000000") {
      role.name = "DEFAULT_ADMIN_ROLE"
    } else if (roleBytes.toHexString() == "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6") {
      role.name = "MINTER_ROLE"
    } else if (roleBytes.toHexString() == "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848") {
      role.name = "BURNER_ROLE"
    } else {
      role.name = "UNKNOWN_ROLE"
    }
    
    role.accounts = []
    role.save()
  }
  
  return role as Role
}

export function handleApproval(event: ApprovalEvent): void {
  let tokenAddress = event.address
  let token = fetchToken(tokenAddress)
  
  // Update token stats
  token.approvalCount = token.approvalCount.plus(ONE_BI)
  token.save()
  
  // Get or create owner account
  let owner = fetchAccount(event.params.owner, tokenAddress)
  owner.approvalCount = owner.approvalCount.plus(ONE_BI)
  owner.lastUpdated = event.block.timestamp
  owner.save()
  
  // Get or create spender account
  let spender = fetchAccount(event.params.spender, tokenAddress)
  spender.lastUpdated = event.block.timestamp
  spender.save()
  
  // Get or create transaction
  let transaction = fetchTransaction(event)
  
  // Create approval entity
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = owner.id
  entity.spender = spender.id
  entity.value = event.params.value
  entity.token = token.id
  entity.transaction = transaction.id
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let role = fetchRole(event.params.role)
  let previousAdminRole = fetchRole(event.params.previousAdminRole)
  let newAdminRole = fetchRole(event.params.newAdminRole)
  
  // Update role admin relationship
  role.adminRole = newAdminRole.id
  role.save()
  
  // Create event entity
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let role = fetchRole(event.params.role)
  
  // Add account to role
  let accounts = role.accounts
  let accountAddress = event.params.account.toHexString()
  
  if (!accounts.includes(Bytes.fromHexString(accountAddress))) {
    accounts.push(Bytes.fromHexString(accountAddress))
    role.accounts = accounts
    role.save()
  }
  
  // Create event entity
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let role = fetchRole(event.params.role)
  
  // Remove account from role
  let accounts = role.accounts
  let accountAddress = event.params.account.toHexString()
  
  // Filter out the revoked account
  let updatedAccounts: Bytes[] = []
  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].toHexString() != accountAddress) {
      updatedAccounts.push(accounts[i])
    }
  }
  
  role.accounts = updatedAccounts
  role.save()
  
  // Create event entity
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let tokenAddress = event.address
  let token = fetchToken(tokenAddress)
  let value = event.params.value
  
  // Check if this is a mint or burn
  let fromAddress = event.params.from.toHexString()
  let toAddress = event.params.to.toHexString()
  let isMint = fromAddress == ZERO_ADDRESS
  let isBurn = toAddress == ZERO_ADDRESS
  
  // Update token stats
  token.transferCount = token.transferCount.plus(ONE_BI)
  token.totalTransfers = token.totalTransfers.plus(ONE_BI)
  
  if (isMint) {
    token.totalSupply = token.totalSupply.plus(value)
    token.totalMints = token.totalMints.plus(ONE_BI)
  } else if (isBurn) {
    token.totalSupply = token.totalSupply.minus(value)
    token.totalBurns = token.totalBurns.plus(ONE_BI)
  }
  
  token.save()
  
  // Get or create from account
  let from = fetchAccount(event.params.from, tokenAddress)
  from.transferCount = from.transferCount.plus(ONE_BI)
  
  // Get or create to account
  let to = fetchAccount(event.params.to, tokenAddress)
  to.transferCount = to.transferCount.plus(ONE_BI)
  
  // Update balances
  if (!isMint) {
    from.balance = from.balance.minus(value)
    from.lastUpdated = event.block.timestamp
    
    // Create balance snapshot
    createAccountBalance(from, token, from.balance, event)
  }
  
  if (!isBurn) {
    to.balance = to.balance.plus(value)
    to.lastUpdated = event.block.timestamp
    
    // Create balance snapshot
    createAccountBalance(to, token, to.balance, event)
  }
  
  from.save()
  to.save()
  
  // Get or create transaction
  let transaction = fetchTransaction(event)
  
  // Update daily metrics
  let dailyMetric = fetchDailyMetric(tokenAddress, event.block.timestamp)
  dailyMetric.dailyTransferCount = dailyMetric.dailyTransferCount.plus(ONE_BI)
  dailyMetric.dailyTransferVolume = dailyMetric.dailyTransferVolume.plus(value)
  
  if (isMint) {
    dailyMetric.dailyMintCount = dailyMetric.dailyMintCount.plus(ONE_BI)
    dailyMetric.dailyMintVolume = dailyMetric.dailyMintVolume.plus(value)
  } else if (isBurn) {
    dailyMetric.dailyBurnCount = dailyMetric.dailyBurnCount.plus(ONE_BI)
    dailyMetric.dailyBurnVolume = dailyMetric.dailyBurnVolume.plus(value)
  }
  
  // Track active accounts
  // This is a simplistic approach - in a production subgraph you might want to use a more sophisticated method
  dailyMetric.dailyActiveAccounts = dailyMetric.dailyActiveAccounts.plus(ONE_BI)
  
  dailyMetric.save()
  
  // Create transfer entity
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = from.id
  entity.to = to.id
  entity.value = value
  entity.token = token.id
  entity.transaction = transaction.id
  entity.isMint = isMint
  entity.isBurn = isBurn
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}
