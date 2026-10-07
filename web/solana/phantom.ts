import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletReadyState, scopePollingDetectionStrategy } from "@solana/wallet-adapter-base";

export type PhantomProvider = {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: unknown;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<unknown>;
  on(event: "accountChanged", listener: (publicKey: unknown) => void): void;
  off(event: "accountChanged", listener: (publicKey: unknown) => void): void;
};

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const injected = window as Window & {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const provider = injected.phantom?.solana || injected.solana;
  return provider?.isPhantom ? provider : null;
}

export class SolPactPhantomAdapter extends PhantomWalletAdapter {
  constructor() {
    super();
    if (typeof window !== "undefined") {
      scopePollingDetectionStrategy(() => {
        if (!getPhantomProvider()) return false;
        this.emit("readyStateChange", WalletReadyState.Installed);
        return true;
      });
    }
  }

  override get readyState() {
    // Traditional Phantom injection may not expose the newer global marker.
    return getPhantomProvider() ? WalletReadyState.Installed : super.readyState;
  }

  override async autoConnect() {
    if (this.readyState !== WalletReadyState.Installed) return;
    const provider = getPhantomProvider();
    if (!provider) return;
    try {
      await provider.connect({ onlyIfTrusted: true });
    } catch {
      // Restoring a saved wallet must never open a new authorization prompt.
      return;
    }
    await super.connect();
  }
}
