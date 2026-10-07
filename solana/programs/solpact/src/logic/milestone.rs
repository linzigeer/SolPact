use super::validation;
use crate::{
    errors::PactError,
    state::{Milestone, MilestoneStatus},
};
use anchor_lang::prelude::*;

impl Milestone {
    pub fn submit(&mut self, uri: String, now: i64) -> Result<()> {
        require!(
            self.status == MilestoneStatus::Pending,
            PactError::InvalidMilestoneState
        );
        require!(now <= self.deadline, PactError::DeadlinePassed);
        require!(!uri.trim().is_empty(), PactError::EmptyUri);
        validation::text(&uri)?;
        self.status = MilestoneStatus::Submitted;
        self.submitted_at = now;
        self.deliverable_uri = uri;
        Ok(())
    }

    pub fn dispute(&mut self) -> Result<()> {
        require!(
            self.status == MilestoneStatus::Submitted,
            PactError::InvalidMilestoneState
        );
        self.status = MilestoneStatus::Disputed;
        Ok(())
    }
}
