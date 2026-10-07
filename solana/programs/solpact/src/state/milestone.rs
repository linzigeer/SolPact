use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum MilestoneStatus {
    Pending,
    Submitted,
    Approved,
    Disputed,
    Refunded,
    Resolved,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct Milestone {
    pub version: u8,
    pub project: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub deadline: i64,
    pub submitted_at: i64,
    pub seller_paid: u64,
    pub buyer_refunded: u64,
    pub status: MilestoneStatus,
    pub bump: u8,
    #[max_len(256)]
    pub description: String,
    #[max_len(256)]
    pub deliverable_uri: String,
}
