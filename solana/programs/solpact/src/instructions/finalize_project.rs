use crate::{contexts::ManageProject, events::ProjectCreated};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ManageProject>) -> Result<()> {
    ctx.accounts
        .project
        .finalize(Clock::get()?.unix_timestamp)?;
    emit!(ProjectCreated {
        project: ctx.accounts.project.key(),
        total_amount: ctx.accounts.project.total_amount,
        milestone_count: ctx.accounts.project.milestone_count
    });
    Ok(())
}
