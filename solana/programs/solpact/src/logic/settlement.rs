use crate::{constants::BPS_DENOMINATOR, errors::PactError, state::*};
use anchor_lang::prelude::*;

#[derive(Clone, Copy, Debug)]
pub enum Settlement {
    Approval,
    AutoRelease,
    Refund,
    Arbitration(u16),
}

/// Validate and calculate before any CPI or account mutation.
pub fn payouts(
    project: &Project,
    milestone: &Milestone,
    kind: Settlement,
    now: i64,
) -> Result<(u64, u64, MilestoneStatus)> {
    require!(
        project.status == ProjectStatus::Funded,
        PactError::NotFunded
    );
    let amount = milestone.amount;
    match kind {
        Settlement::Approval | Settlement::AutoRelease => {
            require!(
                milestone.status == MilestoneStatus::Submitted,
                PactError::InvalidMilestoneState
            );
            if matches!(kind, Settlement::AutoRelease) {
                let unlock = milestone
                    .submitted_at
                    .checked_add(project.auto_release_window)
                    .ok_or(PactError::MathOverflow)?;
                require!(now >= unlock, PactError::TooEarly);
            }
            Ok((amount, 0, MilestoneStatus::Approved))
        }
        Settlement::Refund => {
            require!(
                milestone.status == MilestoneStatus::Pending,
                PactError::InvalidMilestoneState
            );
            require!(now > milestone.deadline, PactError::NotOverdue);
            Ok((0, amount, MilestoneStatus::Refunded))
        }
        Settlement::Arbitration(bps) => {
            require!(
                milestone.status == MilestoneStatus::Disputed,
                PactError::InvalidMilestoneState
            );
            let (seller, buyer) = split(amount, bps)?;
            Ok((seller, buyer, MilestoneStatus::Resolved))
        }
    }
}

pub fn split(amount: u64, bps: u16) -> Result<(u64, u64)> {
    require!(bps <= BPS_DENOMINATOR, PactError::InvalidBps);
    let seller = u64::try_from(u128::from(amount) * u128::from(bps) / u128::from(BPS_DENOMINATOR))
        .map_err(|_| PactError::MathOverflow)?;
    Ok((
        seller,
        amount.checked_sub(seller).ok_or(PactError::MathOverflow)?,
    ))
}

/// Only called after payouts validates the source state. Compute all next values
/// before writing, so this helper is also atomic outside the Solana runtime.
pub fn record(
    project: &mut Project,
    milestone: &mut Milestone,
    seller: u64,
    buyer: u64,
    status: MilestoneStatus,
) -> Result<bool> {
    require!(
        project.status == ProjectStatus::Funded,
        PactError::NotFunded
    );
    require!(
        matches!(
            milestone.status,
            MilestoneStatus::Pending | MilestoneStatus::Submitted | MilestoneStatus::Disputed
        ),
        PactError::InvalidMilestoneState
    );
    require!(
        matches!(
            (milestone.status, status),
            (MilestoneStatus::Submitted, MilestoneStatus::Approved)
                | (MilestoneStatus::Pending, MilestoneStatus::Refunded)
                | (MilestoneStatus::Disputed, MilestoneStatus::Resolved)
        ),
        PactError::InvalidMilestoneState
    );
    require!(
        seller.checked_add(buyer) == Some(milestone.amount),
        PactError::InvalidAccounting
    );
    require!(
        milestone.seller_paid == 0 && milestone.buyer_refunded == 0,
        PactError::InvalidAccounting
    );
    let settled = project
        .settled_amount
        .checked_add(milestone.amount)
        .ok_or(PactError::MathOverflow)?;
    let seller_total = project
        .seller_paid_amount
        .checked_add(seller)
        .ok_or(PactError::MathOverflow)?;
    let buyer_total = project
        .buyer_refunded_amount
        .checked_add(buyer)
        .ok_or(PactError::MathOverflow)?;
    let count = project
        .settled_count
        .checked_add(1)
        .ok_or(PactError::MathOverflow)?;
    require!(
        settled <= project.total_amount && count <= project.milestone_count,
        PactError::InvalidAccounting
    );
    require!(
        seller_total.checked_add(buyer_total) == Some(settled),
        PactError::InvalidAccounting
    );
    let completed = count == project.milestone_count;
    require!(
        completed == (settled == project.total_amount),
        PactError::InvalidAccounting
    );
    project.settled_amount = settled;
    project.seller_paid_amount = seller_total;
    project.buyer_refunded_amount = buyer_total;
    project.settled_count = count;
    if completed {
        project.status = ProjectStatus::Completed;
    }
    milestone.seller_paid = seller;
    milestone.buyer_refunded = buyer;
    milestone.status = status;
    Ok(completed)
}
