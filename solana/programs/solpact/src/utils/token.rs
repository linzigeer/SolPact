use crate::{constants::PROJECT_SEED, contexts::SettleMilestone};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, TransferChecked};

pub fn from_vault<'info>(
    accounts: &SettleMilestone<'info>,
    recipient: &Account<'info, TokenAccount>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let project = &accounts.project;
    let bump = [project.bump];
    let seeds: &[&[u8]] = &[
        PROJECT_SEED,
        project.buyer.as_ref(),
        project.project_id.as_ref(),
        &bump,
    ];
    token::transfer_checked(
        CpiContext::new_with_signer(
            accounts.token_program.to_account_info(),
            TransferChecked {
                from: accounts.vault.to_account_info(),
                mint: accounts.mint.to_account_info(),
                to: recipient.to_account_info(),
                authority: project.to_account_info(),
            },
            &[seeds],
        ),
        amount,
        accounts.mint.decimals,
    )
}
