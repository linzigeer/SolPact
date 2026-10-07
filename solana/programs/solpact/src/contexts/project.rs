use crate::{constants::*, errors::PactError, state::Project};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ManageProject<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut, seeds = [PROJECT_SEED, project.buyer.as_ref(), project.project_id.as_ref()],
        bump = project.bump, has_one = buyer @ PactError::Unauthorized,
        constraint = project.version == ACCOUNT_VERSION @ PactError::InvalidVersion
    )]
    pub project: Account<'info, Project>,
}
