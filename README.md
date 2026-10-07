# SolPact

> Agree. Deliver. Get paid. Milestone-based USDC escrow and settlement for service work on Solana.

SolPact's escrow program is deployed and tested on Solana Devnet. The frontend provides Phantom-first wallet connection and migration previews while settlement transactions are being integrated.

## Current status

| Layer | Status |
|-------|--------|
| Frontend (`web/`) | Live wallet-role project queries, resumable creation, funding, delivery, payments, refunds and arbitration |
| Solana wallets | Phantom preferred, Solflare supported; connect/disconnect, account switching, public keys, and Devnet balance reads |
| Solana program (`solana/`) | Deployed and tested on Devnet: 175 real test transactions, 83 assertions, including the one-hour automatic release |
| Chain transactions | Simulation, wallet signing, broadcast and confirmed-state updates enabled |
| Original EVM implementation | Contract workspace removed; Git history, historical ABI and opt-in legacy frontend retained |

The dashboard and project pages use real program accounts. Only the homepage animation and `/project/demo` are illustrative samples. Wallet-authorized writes target Solana Devnet.

## Run the frontend

```bash
cd web
cp .env.local.example .env.local  # first-time setup
corepack pnpm install --frozen-lockfile
corepack pnpm dev --hostname 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000). Install [Phantom](https://phantom.com/download) or use Solflare. Reads use Devnet RPC; each write requires wallet transaction approval. See [the frontend guide](web/README.md) for private RPC setup, test tokens, account rules and recovery.

| Page | Purpose |
|------|---------|
| `/` | SolPact landing page and animated Solana settlement preview |
| `/dashboard` | Live projects for the wallet’s buyer/seller/arbitrator roles |
| `/project/new` | Live phased creation with interruption recovery |
| `/project/<PDA>` | Funding, delivery, settlement, refunds and arbitration |
| `/project/demo` | Explicitly labeled sample detail |
| `/demo-slides.html` | Solana migration presentation |

## Verify

```bash
cd web
corepack pnpm build
corepack pnpm test:protocol
```

The production build includes lint and TypeScript checks. Browser checks should cover wallet detection, authorization/rejection, account changes, disconnect, trusted-session restoration, balance reads/errors, and the absence of transaction signing and legacy-chain requests.

## Wallet configuration

The app queries **Devnet**, independently of the balance currently displayed inside the wallet extension. Enable Phantom’s testnet mode and select Devnet there to compare balances. On mobile, open the app in the wallet’s built-in browser.

- `NEXT_PUBLIC_SOLANA_RPC_URL` — optional custom **Devnet** RPC; defaults to `https://api.devnet.solana.com`.
- `NEXT_PUBLIC_SOLANA_USDC_MINT` — defaults to Circle Devnet USDC `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`; it must match the deployed program. Mainnet addresses must not be used on Devnet.
- `SOLANA_RPC_URL` — private server-side RPC. Browser queries and broadcasts use the app RPC gateway without exposing API keys.

The connection flow only requests public-key access. Previously authorized sessions restore silently: `onlyIfTrusted` for traditional Phantom injection, or Wallet Standard’s silent connection. Rejected connections leave the app disconnected. Copying addresses, viewing them on Solana Explorer, and refreshing balances are available after connection.

## Solana integration next steps

See the [Solana program guide](solana/README.md) for the account model, instructions, build configuration, and test commands.

- Run the [Solana program build and tests](solana/README.md).
- Frontend program instruction and role validation are integrated.
- Frontend SPL USDC deposits and settlements are integrated.
- Project data now comes from program accounts; transactions wait for confirmation.
- Review the [Devnet deployment and protocol test report](solana/deployments/devnet-test-report.md), then integrate the browser buyer/seller workflow.

## Historical prototype

The original prototype was built on Avalanche Fuji. The old `contracts/` Foundry workspace has been removed after the Solana migration; its source remains in Git history.

Historical ABIs and `web/legacy/evm/` remain available for inspecting the old deployment through the explicit `NEXT_PUBLIC_ENABLE_LEGACY_DEMO=true` flag. They are not part of the active Solana contract workspace. The two remaining Fuji MockUSDC test balances were left on the old chain; they do not affect Solana.

The `docs/` directory is kept locally for reference and is excluded from version control.

## License

MIT
