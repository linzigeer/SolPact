# SolPact — Web

The SolPact frontend connects Phantom and Solflare to the deployed Solana Devnet escrow program. It includes real project account queries, resumable milestone creation, USDC deposits, delivery submission, settlement operations, and wallet-signed transaction confirmation. Full browser workflow validation remains outstanding.

## Run locally

```bash
cp .env.local.example .env.local
corepack pnpm install --frozen-lockfile
corepack pnpm dev --hostname 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000). Use a Devnet wallet with test SOL for fees and Circle Devnet USDC for deposits. The landing animation and `/project/demo` use illustrative data; the dashboard and project-address routes read program accounts.

## Configuration

The program and USDC mint default to the current deployment recorded in [`../solana/deployments/`](../solana/deployments/). See [`.env.local.example`](.env.local.example) for overrides. Browser RPC calls go through `/api/solana/devnet`; use the server-only `SOLANA_RPC_URL` variable for a provider endpoint containing credentials.

## Structure

- `solana/` — wallet adapters, account queries, IDL, instruction builders, draft recovery, and transaction tracking.
- `app/` — landing, dashboard, creation, detail, and Devnet RPC proxy routes.
- `components/` — shared interface components and the sample project preview.
- `legacy/evm/` — archived EVM demo, enabled only with `NEXT_PUBLIC_ENABLE_LEGACY_DEMO=true`.

## Verify

```bash
corepack pnpm lint
corepack pnpm build
```

The production build includes TypeScript checks. Browser verification should cover wallet authorization and rejection, account switching, draft recovery, all settlement roles, and uncertain transaction confirmations. See the [project README](../README.md) for the full setup and current validation status.
