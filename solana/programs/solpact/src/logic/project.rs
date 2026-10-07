use crate::{
    errors::PactError,
    state::{Project, ProjectStatus},
};
use anchor_lang::prelude::*;

impl Project {
    pub fn append(&mut self, index: u8, amount: u64, deadline: i64, now: i64) -> Result<()> {
        require!(
            self.status == ProjectStatus::Draft,
            PactError::InvalidProjectState
        );
        require!(
            index == self.milestone_count && index < self.expected_milestones,
            PactError::InvalidIndex
        );
        require!(amount > 0, PactError::ZeroAmount);
        require!(deadline > now, PactError::DeadlinePassed);
        let total = self
            .total_amount
            .checked_add(amount)
            .ok_or(PactError::MathOverflow)?;
        let count = self
            .milestone_count
            .checked_add(1)
            .ok_or(PactError::MathOverflow)?;
        self.total_amount = total;
        self.milestone_count = count;
        self.min_deadline = self.min_deadline.min(deadline);
        Ok(())
    }

    pub fn finalize(&mut self, now: i64) -> Result<()> {
        require!(
            self.status == ProjectStatus::Draft,
            PactError::InvalidProjectState
        );
        require!(
            self.milestone_count == self.expected_milestones && self.milestone_count > 0,
            PactError::IncompleteProject
        );
        require!(self.total_amount > 0, PactError::ZeroAmount);
        require!(now < self.min_deadline, PactError::DeadlinePassed);
        self.status = ProjectStatus::Created;
        Ok(())
    }

    pub fn cancel(&mut self) -> Result<()> {
        require!(
            matches!(self.status, ProjectStatus::Draft | ProjectStatus::Created),
            PactError::InvalidProjectState
        );
        self.status = ProjectStatus::Cancelled;
        Ok(())
    }

    pub fn fund(&mut self, now: i64) -> Result<()> {
        require!(
            self.status == ProjectStatus::Created,
            PactError::InvalidProjectState
        );
        require!(now < self.min_deadline, PactError::DeadlinePassed);
        self.status = ProjectStatus::Funded;
        Ok(())
    }
}
