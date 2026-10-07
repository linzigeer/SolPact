use anchor_lang::prelude::*;

pub const ACCOUNT_VERSION: u8 = 1;
pub const PROJECT_SEED: &[u8] = b"project";
pub const MILESTONE_SEED: &[u8] = b"milestone";
pub const MAX_MILESTONES: u8 = 20;
pub const MAX_TEXT_BYTES: usize = 256;
pub const MIN_RELEASE_WINDOW: i64 = 3_600;
pub const MAX_RELEASE_WINDOW: i64 = 90 * 24 * 3_600;
pub const TOKEN_DECIMALS: u8 = 6;
pub const BPS_DENOMINATOR: u16 = 10_000;

// Local SVM tests install an isolated test mint at the Devnet address.
// There is no instruction that changes the supported mint at runtime.
#[cfg(not(feature = "mainnet"))]
pub const SUPPORTED_MINT: Pubkey = pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
#[cfg(feature = "mainnet")]
pub const SUPPORTED_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
