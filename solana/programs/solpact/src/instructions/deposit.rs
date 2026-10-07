use crate::{contexts::Deposit, errors::PactError, events::Deposited};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, TransferChecked};

pub fn handler(ctx: Context<Deposit>) -> Result<()> {
    ctx.accounts.project.fund(Clock::get()?.unix_timestamp)?;
    let amount = ctx.accounts.project.total_amount;
    token::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.buyer_ata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;
    ctx.accounts.vault.reload()?;
    require!(
        ctx.accounts.vault.amount >= amount,
        PactError::InvalidAccounting
    );
    emit!(Deposited {
        project: ctx.accounts.project.key(),
        amount
    });
    Ok(())
}
