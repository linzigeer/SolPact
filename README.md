# SolPact

> Agree. Deliver. Get paid.

SolPact is a milestone-based USDC escrow platform on Solana for clients and freelancers. Clients secure project funds in smart contracts, and service providers receive payments as agreed milestones are delivered and approved. The protocol supports time-based payment claims, refunds for missed deadlines, and optional dispute arbitration, making service payments transparent and verifiable on-chain.

## Features

- Create projects with 1–20 milestones, delivery deadlines, and an optional arbitrator.
- Fund a dedicated project vault with USDC.
- Submit delivery links and approve milestone payments.
- Claim payment after the agreed review window, or refund undelivered milestones after their deadlines.
- Resolve disputes through a designated arbitrator with a configurable payment split.
- Connect Phantom or Solflare, view balances and project accounts, and follow transaction confirmations on Solana Explorer.
- Resume partially created projects using saved draft plans and confirmed on-chain progress.

Time-based release requires the seller to submit a claim transaction; the program does not initiate payments on its own.

## Current status

SolPact is a **Solana Devnet prototype**. The Anchor program is deployed, and the frontend includes program account reads and wallet-signed transaction flows. Full browser buyer/seller workflow validation remains outstanding.

The recorded [Devnet test report](solana/deployments/devnet-test-report.md) contains confirmed transactions and protocol checks. At the time of that report, final verification of the real one-hour claim window was still pending. The [local test suite](solana/README.md) covers all settlement paths, authorization, account isolation, transaction limits, and rollback behavior.

| Configuration | Value |
| --- | --- |
| Network | Solana Devnet |
| Program | [`8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt`](https://explorer.solana.com/address/8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt?cluster=devnet) |
| USDC mint | [`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`](https://explorer.solana.com/address/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU?cluster=devnet) |

Devnet tokens have no monetary value. This repository is not a mainnet deployment.

## Quick start

Install Node.js 20 or later with Corepack, then run:

```bash
git clone https://github.com/linzigeer/SolPact.git
cd SolPact/web
cp .env.local.example .env.local
corepack pnpm install --frozen-lockfile
corepack pnpm dev --hostname 0.0.0.0
```

Open [http://localhost:3000](http://localhost:3000). Enable Devnet in Phantom or Solflare and use test SOL for fees and Circle Devnet USDC for escrow deposits. Connecting a wallet grants public-key access; project operations request transaction signatures separately.

| Page | Purpose |
| --- | --- |
| `/` | Project introduction and illustrative settlement animation |
| `/dashboard` | Projects associated with the connected wallet |
| `/project/new` | Create a milestone-based project |
| `/project/<project-address>` | Read project accounts and execute permitted milestone operations |
| `/project/demo` | Clearly labeled sample project |
| `/demo-slides.html` | Presentation slides |

## Configuration

The frontend defaults to the deployed Devnet program and USDC mint above. Optional overrides in `web/.env.local`:

- `NEXT_PUBLIC_SOLANA_PROGRAM_ID` — Devnet program address; the frontend IDL must match the program.
- `NEXT_PUBLIC_SOLANA_USDC_MINT` — classic SPL Token USDC mint with six decimals, matching the deployed program.
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Devnet RPC endpoint; defaults to `https://api.devnet.solana.com`.
- `SOLANA_RPC_URL` — optional server-side RPC endpoint for the Next.js proxy, including provider credentials when required.

Browser requests use the app's `/api/solana/devnet` proxy. Keep RPC credentials in `SOLANA_RPC_URL`, not a `NEXT_PUBLIC_` variable. Local environment files and wallet keypairs are excluded from Git.

## Build and test

Frontend production build, including lint and TypeScript checks:

```bash
cd web
corepack pnpm build
```

Program validation requires Anchor CLI 0.31.1, Rust/Cargo, and Node.js. The setup script installs the pinned SBF builder locally:

```bash
cd solana
corepack pnpm install --frozen-lockfile
corepack pnpm setup:tools
corepack pnpm check
```

The program checks run formatting, SBF/IDL builds, Rust unit tests, Clippy, TypeScript checks, and LiteSVM execution tests. They do not require an RPC validator, funded wallets, or live-chain transactions. See the [program guide](solana/README.md) and [Devnet test instructions](solana/scripts/devnet/README.md) for details.

## Repository layout

- `web/` — Next.js, React, TypeScript, Tailwind CSS, and Solana wallet integration.
- `solana/` — Anchor program, local tests, Devnet scripts, and deployment records.
- `docs/` — protocol design, implementation notes, and presentation materials.
- `promo/` — promotional scripts, subtitles, and audio assets.
- `contracts/` and `web/legacy/evm/` — archived EVM prototype, preserved for reference.

The default application uses Solana. The archived EVM demo is available only with `NEXT_PUBLIC_ENABLE_LEGACY_DEMO=true`; see the [legacy guide](docs/legacy-avalanche.md). Documents `docs/01` through `docs/05` describe that historical prototype.

## License

MIT. See [LICENSE](LICENSE). Vendored libraries and font assets retain their own license notices.
