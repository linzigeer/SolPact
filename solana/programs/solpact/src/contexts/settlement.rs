use crate::{constants::*, errors::PactError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{Mint, Token, TokenAccount},
};

/// All settlement paths share the same validated account graph. Both recipient
/// ATAs must exist; any fee payer can create them idempotently before settlement.
#[derive(Accounts)]
pub struct SettleMilestone<'info> {
    pub actor: Signer<'info>,
    #[account(
        mut, seeds = [PROJECT_SEED, project.buyer.as_ref(), project.project_id.as_ref()], bump = project.bump,
        has_one = mint @ PactError::InvalidMint, has_one = vault @ PactError::InvalidVault,
        constraint = project.version == ACCOUNT_VERSION @ PactError::InvalidVersion,
        constraint = project.status == ProjectStatus::Funded @ PactError::NotFunded
    )]
    pub project: Account<'info, Project>,
    #[account(
        mut, seeds = [MILESTONE_SEED, project.key().as_ref(), &[milestone.index]], bump = milestone.bump,
        has_one = project,
        constraint = milestone.version == ACCOUNT_VERSION @ PactError::InvalidVersion,
        constraint = milestone.index < project.milestone_count @ PactError::InvalidIndex
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(address = SUPPORTED_MINT @ PactError::InvalidMint,
        constraint = mint.decimals == TOKEN_DECIMALS @ PactError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = project,
        associated_token::token_program = token_program,
        constraint = vault.key() != buyer_ata.key() && vault.key() != seller_ata.key() @ PactError::InvalidVault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint,
        constraint = buyer_ata.owner == project.buyer @ PactError::InvalidRecipient,
        constraint = buyer_ata.key() == get_associated_token_address(&project.buyer, &mint.key()) @ PactError::InvalidRecipient)]
    pub buyer_ata: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint,
        constraint = seller_ata.owner == project.seller @ PactError::InvalidRecipient,
        constraint = seller_ata.key() == get_associated_token_address(&project.seller, &mint.key()) @ PactError::InvalidRecipient,
        constraint = seller_ata.key() != buyer_ata.key() @ PactError::InvalidRecipient)]
    pub seller_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
