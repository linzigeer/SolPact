use super::*;
use crate::logic::validation::*;

#[test]
fn creation_accepts_window_and_count_endpoints() {
    let p = project(1);
    for count in [1, 20] {
        for window in [MIN_RELEASE_WINDOW, MAX_RELEASE_WINDOW] {
            creation(p.buyer, p.seller, p.arbitrator, count, window).unwrap();
        }
    }
    creation(p.buyer, p.seller, None, 1, MIN_RELEASE_WINDOW).unwrap();
}

#[test]
fn creation_rejects_invalid_roles_counts_and_windows() {
    let p = project(1);
    for seller in [Pubkey::default(), p.buyer] {
        err(
            creation(p.buyer, seller, None, 1, MIN_RELEASE_WINDOW),
            "InvalidRole",
        );
    }
    for arb in [Pubkey::default(), p.buyer, p.seller] {
        err(
            creation(p.buyer, p.seller, Some(arb), 1, MIN_RELEASE_WINDOW),
            "InvalidRole",
        );
    }
    for count in [0, 21, u8::MAX] {
        err(
            creation(p.buyer, p.seller, None, count, MIN_RELEASE_WINDOW),
            "InvalidMilestoneCount",
        );
    }
    for window in [i64::MIN, 0, MIN_RELEASE_WINDOW - 1, MAX_RELEASE_WINDOW + 1] {
        err(
            creation(p.buyer, p.seller, None, 1, window),
            "InvalidWindow",
        );
    }
}

#[test]
fn text_limits_count_utf8_bytes() {
    text(&"x".repeat(256)).unwrap();
    text(&"中".repeat(85)).unwrap();
    err(text(&"x".repeat(257)), "TextTooLong");
    err(text(&"中".repeat(86)), "TextTooLong");
}

#[test]
fn account_allocation_matches_the_schema() {
    assert_eq!(8 + Project::INIT_SPACE, 247);
    assert_eq!(8 + Milestone::INIT_SPACE, 604);
    let p = project(20);
    let mut m = milestone(u64::MAX);
    m.description = "x".repeat(256);
    m.deliverable_uri = "y".repeat(256);
    assert_eq!(p.try_to_vec().unwrap().len(), Project::INIT_SPACE);
    assert_eq!(m.try_to_vec().unwrap().len(), Milestone::INIT_SPACE);
}
