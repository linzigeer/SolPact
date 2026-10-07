use crate::{contexts::ActOnMilestone, errors::PactError, events::DeliverySubmitted};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ActOnMilestone>, uri: String) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.actor.key(),
        ctx.accounts.project.seller,
        PactError::Unauthorized
    );
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.milestone.submit(uri.clone(), now)?;
    emit!(DeliverySubmitted {
        project: ctx.accounts.project.key(),
        index: ctx.accounts.milestone.index,
        uri,
        submitted_at: now
    });
    Ok(())
}
