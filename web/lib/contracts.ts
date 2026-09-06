import type { Abi, Address } from "viem";
import EscrowJson from "./abi/Escrow.json";
import UsdcJson from "./abi/MockUSDC.json";

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

export const escrowAbi = EscrowJson.abi as Abi;
export const usdcAbi = UsdcJson.abi as Abi;

export const escrowContract = {
  address: ESCROW_ADDRESS,
  abi: escrowAbi,
} as const;

export const usdcContract = {
  address: USDC_ADDRESS,
  abi: usdcAbi,
} as const;

export const ProjectStatus = [
  "Created",
  "Funded",
  "Completed",
  "Cancelled",
] as const;

export const MilestoneStatus = [
  "Pending",
  "Submitted",
  "Approved",
  "Disputed",
  "Refunded",
] as const;

export type ProjectTuple = readonly [
  buyer: Address,
  seller: Address,
  arbitrator: Address,
  token: Address,
  totalAmount: bigint,
  releasedAmount: bigint,
  status: number,
  createdAt: bigint,
  autoReleaseWindow: bigint,
];

export type MilestoneTuple = {
  description: string;
  amount: bigint;
  deadline: bigint;
  status: number;
  deliverableURI: string;
  submittedAt: bigint;
};
