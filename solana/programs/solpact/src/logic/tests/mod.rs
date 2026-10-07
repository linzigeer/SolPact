mod milestones;
mod projects;
mod settlement;
mod validation;

use crate::{constants::*, state::*};
use anchor_lang::prelude::*;

pub fn project(count: u8) -> Project {
    Project {
        version: ACCOUNT_VERSION,
        buyer: Pubkey::new_unique(),
        seller: Pubkey::new_unique(),
        arbitrator: Some(Pubkey::new_unique()),
        mint: SUPPORTED_MINT,
        vault: Pubkey::new_unique(),
        project_id: [1; 16],
        expected_milestones: count,
        milestone_count: 0,
        settled_count: 0,
        total_amount: 0,
        settled_amount: 0,
        seller_paid_amount: 0,
        buyer_refunded_amount: 0,
        created_at: 100,
        min_deadline: i64::MAX,
        auto_release_window: MIN_RELEASE_WINDOW,
        status: ProjectStatus::Draft,
        bump: 255,
    }
}

pub fn milestone(amount: u64) -> Milestone {
    Milestone {
        version: ACCOUNT_VERSION,
        project: Pubkey::new_unique(),
        index: 0,
        amount,
        deadline: 200,
        submitted_at: 0,
        seller_paid: 0,
        buyer_refunded: 0,
        status: MilestoneStatus::Pending,
        bump: 254,
        description: "Design".into(),
        deliverable_uri: String::new(),
    }
}

pub fn funded(amounts: &[u64]) -> Project {
    let mut p = project(amounts.len() as u8);
    for (i, amount) in amounts.iter().enumerate() {
        p.append(i as u8, *amount, 200, 100).unwrap();
    }
    p.finalize(100).unwrap();
    p.fund(100).unwrap();
    p
}

pub fn err<T: std::fmt::Debug>(result: Result<T>, name: &str) {
    let text = format!("{:?}", result.unwrap_err());
    assert!(text.contains(name), "expected {name}: {text}");
}
