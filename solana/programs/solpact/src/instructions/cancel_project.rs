use crate::{contexts::ManageProject, events::ProjectCancelled};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ManageProject>) -> Result<()> {
    ctx.accounts.project.cancel()?;
    emit!(ProjectCancelled {
        project: ctx.accounts.project.key()
    });
    Ok(())
}
