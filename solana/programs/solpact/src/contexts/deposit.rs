use crate::{constants::*, errors::PactError, state::Project};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut, seeds = [PROJECT_SEED, project.buyer.as_ref(), project.project_id.as_ref()],
        bump = project.bump, has_one = buyer @ PactError::Unauthorized,
        has_one = mint @ PactError::InvalidMint, has_one = vault @ PactError::InvalidVault,
        constraint = project.version == ACCOUNT_VERSION @ PactError::InvalidVersion
    )]
    pub project: Account<'info, Project>,
    #[account(address = SUPPORTED_MINT @ PactError::InvalidMint,
        constraint = mint.decimals == TOKEN_DECIMALS @ PactError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = buyer,
        associated_token::token_program = token_program)]
    pub buyer_ata: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = project,
        associated_token::token_program = token_program,
        constraint = vault.key() != buyer_ata.key() @ PactError::InvalidVault)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
