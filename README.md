# B2B Stablecoin Escrow

> Trustless milestone-based B2B payments on Avalanche. Buyer locks USDC, seller delivers, code releases funds in ~2 seconds. 0% platform fee, <$0.01 gas.

**Avalanche Builder Day @ Chengdu · 2026-09-06**

---

## Status

| Layer | Status |
|-------|--------|
| Smart contracts (`contracts/`) | ✅ Escrow + MockUSDC, **6/6 forge tests passing** |
| Frontend (`web/`) | ✅ 4 pages, `pnpm build` green |
| Fuji deploy | ✅ Escrow [`0x6df9…0Eeb`](https://testnet.snowtrace.io/address/0x6df99e9f713aB9ECb57fa4842660CBdE0c000Eeb) · USDC [`0x0bA3…8ff1`](https://testnet.snowtrace.io/address/0x0bA33E7Ac0c997fF627a8AE1FF86f1ca01618ff1) |
| Happy Path | ✅ Project `#0` Completed（Seller +200 USDC） |
| Local dApp | ✅ http://localhost:3000 · slides: `/demo-slides.html` |
| Vercel | ❌ CLI `fetch failed`（本地 `pnpm build` 通过） |

---

## Quick start

### 1. Contracts

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts
forge test -vv

# Deploy to Fuji
cp .env.example .env   # fill DEPLOYER_PRIVATE_KEY, DEMO_BUYER, DEMO_SELLER
source .env
forge script script/Deploy.s.sol --rpc-url fuji --broadcast -vvvv
```

Copy printed `USDC` / `Escrow` addresses into `web/.env.local`.

Export ABIs (already done once; re-run after contract changes):

```bash
mkdir -p ../web/lib/abi
python3 -c 'import json; d=json.load(open("out/Escrow.sol/Escrow.json")); json.dump({"abi":d["abi"]}, open("../web/lib/abi/Escrow.json","w"), indent=2)'
python3 -c 'import json; d=json.load(open("out/MockUSDC.sol/MockUSDC.json")); json.dump({"abi":d["abi"]}, open("../web/lib/abi/MockUSDC.json","w"), indent=2)'
```

### 2. Frontend

```bash
cd web
cp .env.local.example .env.local
# Fill:
# NEXT_PUBLIC_WC_PROJECT_ID=...   (https://cloud.reown.com)
# NEXT_PUBLIC_ESCROW_ADDRESS=0x...
# NEXT_PUBLIC_USDC_ADDRESS=0x...

pnpm install
pnpm dev
```

Open http://localhost:3000

**Wallet: Avalanche Core**（默认）。Install [Core](https://core.app/), import Buyer / Seller private keys from `contracts/.env`, switch to **Avalanche Fuji C-Chain**. Connect via RainbowKit → Core. Deployer never needs a browser wallet (`forge script` uses the key in `.env`).

### 3. Demo flow

1. Connect **Buyer** (Core) → Create Project (paste Seller address + milestones)
2. Buyer → Deposit USDC (approve + deposit)
3. Switch to **Seller** (Core in a second browser profile) → Submit deliverable URI
4. Switch to **Buyer** → Approve → Seller balance updates in ~2s

---

## Docs

| # | Doc |
|---|-----|
| TODO | [TODO.md](./TODO.md) |
| 01 | [Smart Contract](./docs/01-smart-contract.md) |
| 02 | [Frontend](./docs/02-frontend.md) |
| 03 | [Deployment](./docs/03-deployment.md) |
| 04 | [Execution plan](./docs/04-execution-plan.md) |
| 05 | [Demo Day](./docs/05-demo-day.md) |
| Slides | [docs/demo-slides.html](./docs/demo-slides.html)（方向键翻页） |

---

## Architecture

```
Buyer / Seller / Arbitrator
        │
        ▼
Next.js dApp (wagmi + RainbowKit)
        │
        ▼
Avalanche Fuji
├── Escrow.sol
└── MockUSDC.sol
```

## Stack

- **Contracts**: Solidity 0.8.20 · Foundry · OpenZeppelin v5
- **Web**: Next.js 14 · wagmi 2 · viem · RainbowKit · Tailwind
- **Wallet**: Avalanche Core（默认）· RainbowKit / WalletConnect
- **Chain**: Avalanche Fuji C-Chain (43113)

## License

MIT
