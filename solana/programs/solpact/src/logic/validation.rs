use crate::{constants::*, errors::PactError};
use anchor_lang::prelude::*;

pub fn creation(
    buyer: Pubkey,
    seller: Pubkey,
    arbitrator: Option<Pubkey>,
    count: u8,
    window: i64,
) -> Result<()> {
    require!(
        seller != Pubkey::default() && seller != buyer,
        PactError::InvalidRole
    );
    if let Some(arb) = arbitrator {
        require!(
            arb != Pubkey::default() && arb != buyer && arb != seller,
            PactError::InvalidRole
        );
    }
    require!(
        (1..=MAX_MILESTONES).contains(&count),
        PactError::InvalidMilestoneCount
    );
    require!(
        (MIN_RELEASE_WINDOW..=MAX_RELEASE_WINDOW).contains(&window),
        PactError::InvalidWindow
    );
    Ok(())
}

pub fn text(value: &str) -> Result<()> {
    require!(value.len() <= MAX_TEXT_BYTES, PactError::TextTooLong);
    Ok(())
}
