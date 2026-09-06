# B2B Escrow — Contracts

Foundry project for the Avalanche Fuji escrow contracts.

## Commands

```bash
# Install deps (already in lib/)
forge install

# Test
forge test -vv

# Deploy to Fuji
cp .env.example .env   # fill DEPLOYER_PRIVATE_KEY, DEMO_BUYER, DEMO_SELLER
source .env
forge script script/Deploy.s.sol --rpc-url fuji --broadcast -vvvv
```

## Contracts

- `MockUSDC.sol` — 6-decimal test USDC with public mint
- `Escrow.sol` — milestone escrow with auto-release / refund / dispute
