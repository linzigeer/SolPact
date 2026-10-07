use super::*;

#[test]
fn append_tracks_total_count_and_earliest_deadline() {
    let mut p = project(2);
    p.append(0, 100, 300, 100).unwrap();
    p.append(1, 200, 200, 100).unwrap();
    assert_eq!(
        (p.total_amount, p.milestone_count, p.min_deadline),
        (300, 2, 200)
    );
}

#[test]
fn append_rejects_invalid_input_without_mutation() {
    let mut p = project(1);
    err(p.append(1, 1, 200, 100), "InvalidIndex");
    err(p.append(0, 0, 200, 100), "ZeroAmount");
    err(p.append(0, 1, 100, 100), "DeadlinePassed");
    assert_eq!((p.total_amount, p.milestone_count), (0, 0));
}

#[test]
fn append_overflow_is_atomic() {
    let mut p = project(2);
    p.append(0, u64::MAX, 200, 100).unwrap();
    err(p.append(1, 1, 201, 100), "MathOverflow");
    assert_eq!((p.total_amount, p.milestone_count), (u64::MAX, 1));
}

#[test]
fn finalize_requires_complete_unexpired_draft_and_freezes_it() {
    let mut p = project(1);
    err(p.finalize(100), "IncompleteProject");
    p.append(0, 1, 200, 100).unwrap();
    err(p.finalize(200), "DeadlinePassed");
    p.finalize(199).unwrap();
    assert_eq!(p.status, ProjectStatus::Created);
    err(p.append(1, 1, 300, 100), "InvalidProjectState");
    err(p.finalize(199), "InvalidProjectState");
}

#[test]
fn fund_rejects_draft_expired_and_repeated_deposits() {
    let mut p = project(1);
    err(p.fund(100), "InvalidProjectState");
    p.append(0, 5, 200, 100).unwrap();
    p.finalize(100).unwrap();
    err(p.fund(200), "DeadlinePassed");
    p.fund(199).unwrap();
    assert_eq!(p.status, ProjectStatus::Funded);
    err(p.fund(199), "InvalidProjectState");
}

#[test]
fn cancel_only_accepts_unfunded_projects() {
    let mut draft = project(1);
    draft.cancel().unwrap();
    assert_eq!(draft.status, ProjectStatus::Cancelled);
    err(draft.cancel(), "InvalidProjectState");
    err(draft.append(0, 1, 200, 100), "InvalidProjectState");
    let mut created = project(1);
    created.append(0, 1, 200, 100).unwrap();
    created.finalize(100).unwrap();
    created.cancel().unwrap();
    err(created.fund(100), "InvalidProjectState");
    err(funded(&[1]).cancel(), "InvalidProjectState");
}
