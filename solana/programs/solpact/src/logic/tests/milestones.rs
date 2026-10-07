use super::*;

#[test]
fn submit_at_deadline_records_uri_and_clock() {
    let mut m = milestone(1);
    m.submit("ipfs://delivery".into(), 200).unwrap();
    assert_eq!(m.status, MilestoneStatus::Submitted);
    assert_eq!(m.submitted_at, 200);
    assert_eq!(m.deliverable_uri, "ipfs://delivery");
    err(
        m.submit("ipfs://other".into(), 200),
        "InvalidMilestoneState",
    );
}

#[test]
fn submit_rejects_late_or_invalid_evidence() {
    let mut m = milestone(1);
    err(m.submit("uri".into(), 201), "DeadlinePassed");
    err(m.submit("  ".into(), 100), "EmptyUri");
    err(m.submit("中".repeat(86), 100), "TextTooLong");
    assert_eq!(m.status, MilestoneStatus::Pending);
    assert_eq!(m.submitted_at, 0);
}

#[test]
fn dispute_only_follows_submission_and_cannot_repeat() {
    let mut m = milestone(1);
    err(m.dispute(), "InvalidMilestoneState");
    m.submit("uri".into(), 100).unwrap();
    m.dispute().unwrap();
    assert_eq!(m.status, MilestoneStatus::Disputed);
    err(m.dispute(), "InvalidMilestoneState");
}
