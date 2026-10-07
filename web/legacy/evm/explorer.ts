export const SNOWTRACE = "https://testnet.snowtrace.io";

export const snowtraceTx = (hash: string) => `${SNOWTRACE}/tx/${hash}`;
export const snowtraceAddress = (addr: string) => `${SNOWTRACE}/address/${addr}`;

export function toastTx(label: string, hash: string) {
  return {
    message: label,
    description: `${hash.slice(0, 10)}…`,
    action: {
      label: "Snowtrace",
      onClick: () => window.open(snowtraceTx(hash), "_blank"),
    },
  };
}
