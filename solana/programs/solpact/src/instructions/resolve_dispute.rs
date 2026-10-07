use crate::{contexts::SettleMilestone, errors::PactError, logic::settlement::Settlement};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<SettleMilestone>, seller_share_bps: u16) -> Result<()> {
    let arbitrator = ctx
        .accounts
        .project
        .arbitrator
        .ok_or(PactError::NoArbitrator)?;
    require_keys_eq!(
        ctx.accounts.actor.key(),
        arbitrator,
        PactError::Unauthorized
    );
    super::settle::execute(ctx.accounts, Settlement::Arbitration(seller_share_bps))
}
