import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll,
  mockContractFunction
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { Approval, Token, Account, Transaction } from "../generated/schema"
import { Approval as ApprovalEvent, USDC } from "../generated/USDC/USDC"
import { handleApproval, handleTransfer } from "../src/usdc"
import { createApprovalEvent, createTransferEvent } from "./usdc-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("USDC Subgraph Tests", () => {
  beforeAll(() => {
    // Mock contract functions for token metadata
    let contractAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a")
    mockContractFunction(contractAddress, "name", "string name()(USD Coin)")
    mockContractFunction(contractAddress, "symbol", "string symbol()(USDC)")
    mockContractFunction(contractAddress, "decimals", "uint8 decimals()(6)")
  })

  afterAll(() => {
    clearStore()
  })

  test("Token entity is created correctly", () => {
    // Create a transfer event to trigger token creation
    let from = Address.fromString("0x0000000000000000000000000000000000000001")
    let to = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000000) // 1 USDC with 6 decimals
    
    let transferEvent = createTransferEvent(from, to, value)
    handleTransfer(transferEvent)
    
    // Check if Token entity was created
    assert.entityCount("Token", 1)
    
    // Check token properties
    let tokenAddress = transferEvent.address.toHexString()
    assert.fieldEquals("Token", tokenAddress, "name", "USD Coin")
    assert.fieldEquals("Token", tokenAddress, "symbol", "USDC")
    assert.fieldEquals("Token", tokenAddress, "decimals", "6")
    assert.fieldEquals("Token", tokenAddress, "totalTransfers", "1")
    assert.fieldEquals("Token", tokenAddress, "transferCount", "1")
  })

  test("Account entities are created and updated correctly", () => {
    // Create a transfer event
    let from = Address.fromString("0x0000000000000000000000000000000000000001")
    let to = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000000) // 1 USDC with 6 decimals
    
    let transferEvent = createTransferEvent(from, to, value)
    handleTransfer(transferEvent)
    
    // Check if Account entities were created
    assert.entityCount("Account", 2)
    
    // Check account properties
    let fromAddress = from.toHexString()
    let toAddress = to.toHexString()
    
    assert.fieldEquals("Account", fromAddress, "transferCount", "1")
    assert.fieldEquals("Account", fromAddress, "balance", "-1000000")
    
    assert.fieldEquals("Account", toAddress, "transferCount", "1")
    assert.fieldEquals("Account", toAddress, "balance", "1000000")
  })

  test("Approval created and relationships established", () => {
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    let spender = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000000) // 1 USDC with 6 decimals
    
    let approvalEvent = createApprovalEvent(owner, spender, value)
    handleApproval(approvalEvent)
    
    // Check if entities were created
    assert.entityCount("Approval", 1)
    assert.entityCount("Account", 2)
    assert.entityCount("Token", 1)
    assert.entityCount("Transaction", 1)
    
    // Check approval properties
    let approvalId = approvalEvent.transaction.hash.concatI32(approvalEvent.logIndex.toI32()).toHexString()
    let ownerAddress = owner.toHexString()
    let spenderAddress = spender.toHexString()
    let tokenAddress = approvalEvent.address.toHexString()
    let txHash = approvalEvent.transaction.hash.toHexString()
    
    assert.fieldEquals("Approval", approvalId, "owner", ownerAddress)
    assert.fieldEquals("Approval", approvalId, "spender", spenderAddress)
    assert.fieldEquals("Approval", approvalId, "value", "1000000")
    assert.fieldEquals("Approval", approvalId, "token", tokenAddress)
    assert.fieldEquals("Approval", approvalId, "transaction", txHash)
    
    // Check token stats
    assert.fieldEquals("Token", tokenAddress, "approvalCount", "1")
    
    // Check account stats
    assert.fieldEquals("Account", ownerAddress, "approvalCount", "1")
  })

  test("Daily metrics are tracked correctly", () => {
    // Create a transfer event
    let from = Address.fromString("0x0000000000000000000000000000000000000001")
    let to = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000000) // 1 USDC with 6 decimals
    
    let transferEvent = createTransferEvent(from, to, value)
    handleTransfer(transferEvent)
    
    // Check if DailyMetric entity was created
    assert.entityCount("DailyMetric", 1)
    
    // Calculate expected daily metric ID
    let tokenAddress = transferEvent.address.toHexString()
    let dayID = transferEvent.block.timestamp.div(BigInt.fromI32(86400)).toString()
    let dailyMetricId = tokenAddress + "-" + dayID
    
    // Check daily metric properties
    assert.fieldEquals("DailyMetric", dailyMetricId, "dailyTransferCount", "1")
    assert.fieldEquals("DailyMetric", dailyMetricId, "dailyTransferVolume", "1000000")
  })

  test("Mint and burn are detected correctly", () => {
    // Create a mint event (from zero address)
    let zeroAddress = Address.fromString("0x0000000000000000000000000000000000000000")
    let to = Address.fromString("0x0000000000000000000000000000000000000002")
    let value = BigInt.fromI32(1000000) // 1 USDC with 6 decimals
    
    let mintEvent = createTransferEvent(zeroAddress, to, value)
    handleTransfer(mintEvent)
    
    // Check if mint was detected
    let mintTransferId = mintEvent.transaction.hash.concatI32(mintEvent.logIndex.toI32()).toHexString()
    assert.fieldEquals("Transfer", mintTransferId, "isMint", "true")
    assert.fieldEquals("Transfer", mintTransferId, "isBurn", "false")
    
    // Check token stats
    let tokenAddress = mintEvent.address.toHexString()
    assert.fieldEquals("Token", tokenAddress, "totalMints", "1")
    assert.fieldEquals("Token", tokenAddress, "totalSupply", "1000000")
    
    // Create a burn event (to zero address)
    let from = Address.fromString("0x0000000000000000000000000000000000000001")
    
    let burnEvent = createTransferEvent(from, zeroAddress, value)
    handleTransfer(burnEvent)
    
    // Check if burn was detected
    let burnTransferId = burnEvent.transaction.hash.concatI32(burnEvent.logIndex.toI32()).toHexString()
    assert.fieldEquals("Transfer", burnTransferId, "isMint", "false")
    assert.fieldEquals("Transfer", burnTransferId, "isBurn", "true")
    
    // Check token stats
    assert.fieldEquals("Token", tokenAddress, "totalBurns", "1")
    assert.fieldEquals("Token", tokenAddress, "totalSupply", "0") // 1000000 - 1000000 = 0
  })
})
