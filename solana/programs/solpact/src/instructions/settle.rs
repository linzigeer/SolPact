use crate::{
    contexts::SettleMilestone,
    errors::PactError,
    events::*,
    logic::settlement::{self, Settlement},
    utils::token::from_vault,
};
use anchor_lang::prelude::*;

pub fn execute(accounts: &mut SettleMilestone, kind: Settlement) -> Result<()> {
    let (seller, buyer, status) = settlement::payouts(
        &accounts.project,
        &accounts.milestone,
        kind,
        Clock::get()?.unix_timestamp,
    )?;
    let liability = accounts
        .project
        .total_amount
        .checked_sub(accounts.project.settled_amount)
        .ok_or(PactError::InvalidAccounting)?;
    require!(
        accounts.vault.amount >= liability,
        PactError::InvalidAccounting
    );
    let completed = settlement::record(
        &mut accounts.project,
        &mut accounts.milestone,
        seller,
        buyer,
        status,
    )?;
    // Both transfers and every state change are part of one Solana instruction.
    // A failed second CPI rolls back the first CPI and the accounting above.
    from_vault(accounts, &accounts.seller_ata, seller)?;
    from_vault(accounts, &accounts.buyer_ata, buyer)?;
    let reason = match kind {
        Settlement::Approval => SettlementReason::Approval,
        Settlement::AutoRelease => SettlementReason::AutoRelease,
        Settlement::Refund => SettlementReason::DeadlineRefund,
        Settlement::Arbitration(_) => SettlementReason::Arbitration,
    };
    emit!(MilestoneSettled {
        project: accounts.project.key(),
        index: accounts.milestone.index,
        seller_paid: seller,
        buyer_refunded: buyer,
        status,
        reason
    });
    if completed {
        emit!(ProjectCompleted {
            project: accounts.project.key(),
            seller_paid: accounts.project.seller_paid_amount,
            buyer_refunded: accounts.project.buyer_refunded_amount
        });
    }
    Ok(())
}
