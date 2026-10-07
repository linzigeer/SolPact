use crate::{contexts::ActOnMilestone, errors::PactError, events::DisputeRaised};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ActOnMilestone>) -> Result<()> {
    let actor = ctx.accounts.actor.key();
    require!(
        actor == ctx.accounts.project.buyer || actor == ctx.accounts.project.seller,
        PactError::Unauthorized
    );
    require!(
        ctx.accounts.project.arbitrator.is_some(),
        PactError::NoArbitrator
    );
    ctx.accounts.milestone.dispute()?;
    emit!(DisputeRaised {
        project: ctx.accounts.project.key(),
        index: ctx.accounts.milestone.index,
        raised_by: actor
    });
    Ok(())
}
