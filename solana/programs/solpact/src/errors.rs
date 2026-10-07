use anchor_lang::prelude::*;

#[error_code]
pub enum PactError {
    #[msg("The signer does not have the required project role")]
    Unauthorized,
    #[msg("Invalid buyer, seller or arbitrator")]
    InvalidRole,
    #[msg("Unsupported token mint or decimals")]
    InvalidMint,
    #[msg("Token recipient does not match the project")]
    InvalidRecipient,
    #[msg("Vault does not belong to the project")]
    InvalidVault,
    #[msg("This action is not allowed in the current project state")]
    InvalidProjectState,
    #[msg("This action is not allowed in the current milestone state")]
    InvalidMilestoneState,
    #[msg("Project has not been funded or is already completed")]
    NotFunded,
    #[msg("Milestone index is not the expected index")]
    InvalidIndex,
    #[msg("A project must contain between one and twenty milestones")]
    InvalidMilestoneCount,
    #[msg("Not all expected milestones have been added")]
    IncompleteProject,
    #[msg("Milestone amount must be positive")]
    ZeroAmount,
    #[msg("Automatic release window must be between one hour and ninety days")]
    InvalidWindow,
    #[msg("The automatic release window has not elapsed")]
    TooEarly,
    #[msg("The deadline has passed or is invalid for this action")]
    DeadlinePassed,
    #[msg("The delivery deadline has not passed")]
    NotOverdue,
    #[msg("The project does not have an arbitrator")]
    NoArbitrator,
    #[msg("Seller share must be between zero and ten thousand basis points")]
    InvalidBps,
    #[msg("Text exceeds the UTF-8 byte limit")]
    TextTooLong,
    #[msg("The delivery URI must not be empty")]
    EmptyUri,
    #[msg("Arithmetic overflow or underflow")]
    MathOverflow,
    #[msg("Settlement would violate the project accounting invariant")]
    InvalidAccounting,
    #[msg("Account schema version is unsupported")]
    InvalidVersion,
}
