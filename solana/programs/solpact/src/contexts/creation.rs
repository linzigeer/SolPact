use crate::{constants::*, errors::PactError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(project_id: [u8; 16])]
pub struct CreateProject<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init, payer = buyer, space = 8 + Project::INIT_SPACE,
        seeds = [PROJECT_SEED, buyer.key().as_ref(), project_id.as_ref()], bump
    )]
    pub project: Account<'info, Project>,
    #[account(address = SUPPORTED_MINT @ PactError::InvalidMint,
        constraint = mint.decimals == TOKEN_DECIMALS @ PactError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    // Create idempotently in a preceding ATA instruction. This also accepts
    // a legitimate vault created before the project, without resetting it.
    #[account(
        associated_token::mint = mint,
        associated_token::authority = project,
        associated_token::token_program = token_program
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct AddMilestone<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut, seeds = [PROJECT_SEED, project.buyer.as_ref(), project.project_id.as_ref()],
        bump = project.bump, has_one = buyer @ PactError::Unauthorized,
        constraint = project.version == ACCOUNT_VERSION @ PactError::InvalidVersion,
        constraint = project.status == ProjectStatus::Draft @ PactError::InvalidProjectState
    )]
    pub project: Account<'info, Project>,
    #[account(
        init, payer = buyer, space = 8 + Milestone::INIT_SPACE,
        seeds = [MILESTONE_SEED, project.key().as_ref(), &[index]], bump
    )]
    pub milestone: Account<'info, Milestone>,
    pub system_program: Program<'info, System>,
}
