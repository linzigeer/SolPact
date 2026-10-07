# SolPact — Web

Solana Devnet milestone USDC escrow with Phantom-first wallet support. Project pages query real accounts and execute the deployed program’s 11 instructions.

## Run

```bash
cp .env.local.example .env.local  # first-time setup
corepack pnpm install --frozen-lockfile
corepack pnpm dev --hostname 0.0.0.0
```

Open http://localhost:3000. Phantom or Solflare authorization is required for writes; project details can be viewed without connecting.

## Deployment

- Program: `8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt`
- Supported Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- The app verifies Devnet genesis, an executable program, and a classic six-decimal SPL mint before enabling transactions.
- `SOLANA_RPC_URL` is the private **server-side** Devnet endpoint. The browser uses `/api/solana/devnet`; RPC API keys stay off client bundles. The public fallback is `NEXT_PUBLIC_SOLANA_RPC_URL`.
- `NEXT_PUBLIC_SOLANA_PROGRAM_ID` and `NEXT_PUBLIC_SOLANA_USDC_MINT` default to the deployment above. The mint must match the program’s immutable configuration.

Enable Phantom testnet mode and choose Devnet to compare balances. Obtain test SOL at https://faucet.solana.com and test USDC at https://faucet.circle.com. Deposit uses the buyer’s main associated token account, not an arbitrary auxiliary token account.

## Implemented flows

- Dashboard: buyer, seller and arbitrator account filters, live states, empty/error handling, refresh and local draft recovery.
- Create: exact six-decimal amounts, role/address checks, UTF-8 byte limits, 1–20 milestones, configurable 1-hour to 90-day review windows.
- Creation is phased: create draft/vault, append size-bounded milestone batches, finalize. A 16-byte project ID and planned terms are saved before the first signature. A rejected signature or refresh resumes the same PDA. On another device, the buyer can append remaining draft milestones manually.
- Deposit: full project budget into the project’s independent USDC vault; no ERC20 allowance step.
- Delivery, approval, dispute, deadline refund, timed seller claim, and percentage-based arbitration, with role/state/time gates.
- Cancellation only before funding. Accounting separates seller payments, buyer refunds and actual vault balances.
- Each transaction is simulated, signed by the connected wallet, broadcast, and polled to confirmed/finalized. Signed signatures are recorded before broadcast; uncertain outcomes are checked before retry. The UI never treats a signature as successful settlement.
- Wallet and project queries refresh periodically; explorer links show Devnet. Delivery links allow HTTP/HTTPS/IPFS and unsafe schemes are rendered as text.

## Routes

`/dashboard`, `/project/new`, `/project/<PDA>` are live. `/project/demo` and the homepage animation are explicitly labeled illustrative previews.

## Verification

```bash
corepack pnpm build
corepack pnpm test:protocol
```

The protocol test requires `solana/` dependencies and `solana/target/deploy/solpact.so` (build the Anchor workspace first). It executes frontend-built instructions against the actual SBF in isolated LiteSVM: all 11 instructions, payout accounting, precise amount parsing, max description sizes, 20-row batching, and interrupted creation recovery. It uses only local test accounts and tokens.

Browser verification additionally exercises creation/recovery, funding, delivery/payment, disputes/arbitration, cancellation, clock-gated auto-release/refund and wallet-role navigation against an isolated SBF-backed RPC. Devnet deployment and existing account decoding are checked separately with read-only RPC; browser automation does not sign with real user wallets.

## Module map

`solana/protocol.ts` — IDL-backed instructions, PDAs, account decoding and validation.
`solana/transactions.ts` — simulation, signing, confirmation and transaction history.
`solana/creation.ts` — persistent plans and resumable batching.
`solana/hooks.ts` — queries and transaction lifecycle.
`solana/ProjectDashboard.tsx`, `NewProject.tsx`, `ProjectDetail.tsx`, `MilestoneCard.tsx` — live business pages.
`solana/idl/` — synchronized IDL and generated types; update with `corepack pnpm sync:idl` after rebuilding the program.
`legacy/evm/` — historical implementation, opt-in with `NEXT_PUBLIC_ENABLE_LEGACY_DEMO=true` and a rebuild.
