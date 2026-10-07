use crate::{
    constants::ACCOUNT_VERSION,
    contexts::CreateProject,
    events::ProjectDrafted,
    logic::validation,
    state::{Project, ProjectStatus},
};
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<CreateProject>,
    project_id: [u8; 16],
    seller: Pubkey,
    arbitrator: Option<Pubkey>,
    expected_milestones: u8,
    auto_release_window: i64,
) -> Result<()> {
    let buyer = ctx.accounts.buyer.key();
    validation::creation(
        buyer,
        seller,
        arbitrator,
        expected_milestones,
        auto_release_window,
    )?;
    ctx.accounts.project.set_inner(Project {
        version: ACCOUNT_VERSION,
        buyer,
        seller,
        arbitrator,
        mint: ctx.accounts.mint.key(),
        vault: ctx.accounts.vault.key(),
        project_id,
        expected_milestones,
        milestone_count: 0,
        settled_count: 0,
        total_amount: 0,
        settled_amount: 0,
        seller_paid_amount: 0,
        buyer_refunded_amount: 0,
        created_at: Clock::get()?.unix_timestamp,
        min_deadline: i64::MAX,
        auto_release_window,
        status: ProjectStatus::Draft,
        bump: ctx.bumps.project,
    });
    emit!(ProjectDrafted {
        project: ctx.accounts.project.key(),
        buyer,
        seller,
        mint: ctx.accounts.mint.key(),
        expected_milestones
    });
    Ok(())
}
