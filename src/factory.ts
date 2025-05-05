import { TokenCreated as TokenCreatedEvent } from "../generated/USDCFactory/USDCFactory"
import { USDCFactory, Token } from "../generated/schema"
import { USDC as USDCTemplate } from "../generated/templates"
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts"

export function handleTokenCreated(event: TokenCreatedEvent): void {
  // Load the factory entity or create it if it doesn't exist
  let factoryId = event.address.toHexString()
  let factory = USDCFactory.load(factoryId)
  
  if (factory == null) {
    factory = new USDCFactory(factoryId)
    factory.tokenCount = BigInt.fromI32(0)
  }
  
  // Increment the token count
  factory.tokenCount = factory.tokenCount.plus(BigInt.fromI32(1))
  factory.save()
  
  // Create the token entity
  let tokenId = event.params.token.toHexString()
  let token = new Token(tokenId)
  
  // Set initial token properties
  token.factory = factoryId
  token.creator = event.params.creator
  
  // Add default values - these will be updated when the token events are processed
  token.name = "USD Coin"  // Default, will be updated by token contract events
  token.symbol = "USDC"    // Default, will be updated by token contract events
  token.decimals = 6       // Default, will be updated by token contract events
  token.totalSupply = BigInt.fromI32(0)
  token.totalTransfers = BigInt.fromI32(0)
  token.totalMints = BigInt.fromI32(0)
  token.totalBurns = BigInt.fromI32(0)
  token.holderCount = BigInt.fromI32(0)
  token.transferCount = BigInt.fromI32(0)
  token.approvalCount = BigInt.fromI32(0)
  token.createdAtTimestamp = event.block.timestamp
  token.createdAtBlockNumber = event.block.number
  
  token.save()
  
  // Start indexing the newly created token
  USDCTemplate.create(event.params.token)
}