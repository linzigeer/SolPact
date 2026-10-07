import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "SolPact",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo_project_id_replace_me",
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  },
  ssr: true,
});
