use crate::{contexts::SettleMilestone, errors::PactError, logic::settlement::Settlement};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<SettleMilestone>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.actor.key(),
        ctx.accounts.project.buyer,
        PactError::Unauthorized
    );
    super::settle::execute(ctx.accounts, Settlement::Refund)
}
