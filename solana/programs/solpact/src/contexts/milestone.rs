use crate::{constants::*, errors::PactError, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ActOnMilestone<'info> {
    pub actor: Signer<'info>,
    #[account(
        seeds = [PROJECT_SEED, project.buyer.as_ref(), project.project_id.as_ref()], bump = project.bump,
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
}
