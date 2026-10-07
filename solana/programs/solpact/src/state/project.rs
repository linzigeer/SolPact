use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum ProjectStatus {
    Draft,
    Created,
    Funded,
    Completed,
    Cancelled,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct Project {
    pub version: u8,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub arbitrator: Option<Pubkey>,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub project_id: [u8; 16],
    pub expected_milestones: u8,
    pub milestone_count: u8,
    pub settled_count: u8,
    pub total_amount: u64,
    pub settled_amount: u64,
    pub seller_paid_amount: u64,
    pub buyer_refunded_amount: u64,
    pub created_at: i64,
    pub min_deadline: i64,
    pub auto_release_window: i64,
    pub status: ProjectStatus,
    pub bump: u8,
}
