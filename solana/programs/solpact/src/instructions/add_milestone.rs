use crate::{
    constants::ACCOUNT_VERSION,
    contexts::AddMilestone,
    events::MilestoneAdded,
    logic::validation,
    state::{Milestone, MilestoneStatus},
};
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<AddMilestone>,
    index: u8,
    amount: u64,
    deadline: i64,
    description: String,
) -> Result<()> {
    validation::text(&description)?;
    ctx.accounts
        .project
        .append(index, amount, deadline, Clock::get()?.unix_timestamp)?;
    ctx.accounts.milestone.set_inner(Milestone {
        version: ACCOUNT_VERSION,
        project: ctx.accounts.project.key(),
        index,
        amount,
        deadline,
        submitted_at: 0,
        seller_paid: 0,
        buyer_refunded: 0,
        status: MilestoneStatus::Pending,
        bump: ctx.bumps.milestone,
        description,
        deliverable_uri: String::new(),
    });
    emit!(MilestoneAdded {
        project: ctx.accounts.project.key(),
        index,
        amount,
        deadline
    });
    Ok(())
}
