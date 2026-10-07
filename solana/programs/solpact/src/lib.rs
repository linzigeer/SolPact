use anchor_lang::prelude::*;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod logic;
pub mod state;
pub mod utils;

pub use contexts::*;

declare_id!("8yTJg2ze6mPunXu8fgX6DBVwg6kxpLixM2e9DPhcQ5bt");

#[program]
pub mod solpact {
    use super::*;

    pub fn create_project(
        ctx: Context<CreateProject>,
        project_id: [u8; 16],
        seller: Pubkey,
        arbitrator: Option<Pubkey>,
        expected_milestones: u8,
        auto_release_window: i64,
    ) -> Result<()> {
        instructions::create_project::handler(
            ctx,
            project_id,
            seller,
            arbitrator,
            expected_milestones,
            auto_release_window,
        )
    }

    pub fn add_milestone(
        ctx: Context<AddMilestone>,
        index: u8,
        amount: u64,
        deadline: i64,
        description: String,
    ) -> Result<()> {
        instructions::add_milestone::handler(ctx, index, amount, deadline, description)
    }

    pub fn finalize_project(ctx: Context<ManageProject>) -> Result<()> {
        instructions::finalize_project::handler(ctx)
    }

    pub fn cancel_project(ctx: Context<ManageProject>) -> Result<()> {
        instructions::cancel_project::handler(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        instructions::deposit::handler(ctx)
    }

    pub fn submit_delivery(ctx: Context<ActOnMilestone>, uri: String) -> Result<()> {
        instructions::submit_delivery::handler(ctx, uri)
    }

    pub fn raise_dispute(ctx: Context<ActOnMilestone>) -> Result<()> {
        instructions::raise_dispute::handler(ctx)
    }

    pub fn approve_milestone(ctx: Context<SettleMilestone>) -> Result<()> {
        instructions::approve_milestone::handler(ctx)
    }

    pub fn claim_auto_release(ctx: Context<SettleMilestone>) -> Result<()> {
        instructions::claim_auto_release::handler(ctx)
    }

    pub fn refund_on_deadline_miss(ctx: Context<SettleMilestone>) -> Result<()> {
        instructions::refund_on_deadline_miss::handler(ctx)
    }

    pub fn resolve_dispute(ctx: Context<SettleMilestone>, seller_share_bps: u16) -> Result<()> {
        instructions::resolve_dispute::handler(ctx, seller_share_bps)
    }
}
