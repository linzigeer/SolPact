use crate::state::MilestoneStatus;
use anchor_lang::prelude::*;

#[event]
pub struct ProjectDrafted {
    pub project: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub expected_milestones: u8,
}
#[event]
pub struct MilestoneAdded {
    pub project: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub deadline: i64,
}
#[event]
pub struct ProjectCreated {
    pub project: Pubkey,
    pub total_amount: u64,
    pub milestone_count: u8,
}
#[event]
pub struct ProjectCancelled {
    pub project: Pubkey,
}
#[event]
pub struct Deposited {
    pub project: Pubkey,
    pub amount: u64,
}
#[event]
pub struct DeliverySubmitted {
    pub project: Pubkey,
    pub index: u8,
    pub uri: String,
    pub submitted_at: i64,
}
#[event]
pub struct DisputeRaised {
    pub project: Pubkey,
    pub index: u8,
    pub raised_by: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum SettlementReason {
    Approval,
    AutoRelease,
    DeadlineRefund,
    Arbitration,
}

/// One event per settlement, including automatic releases and zero-share awards.
#[event]
pub struct MilestoneSettled {
    pub project: Pubkey,
    pub index: u8,
    pub seller_paid: u64,
    pub buyer_refunded: u64,
    pub status: MilestoneStatus,
    pub reason: SettlementReason,
}
#[event]
pub struct ProjectCompleted {
    pub project: Pubkey,
    pub seller_paid: u64,
    pub buyer_refunded: u64,
}
