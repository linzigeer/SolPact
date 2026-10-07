use super::*;
use crate::logic::settlement::*;

#[test]
fn approval_requires_funded_and_submitted() {
    let p = funded(&[10]);
    let mut m = milestone(10);
    err(
        payouts(&p, &m, Settlement::Approval, 100),
        "InvalidMilestoneState",
    );
    m.submit("uri".into(), 100).unwrap();
    assert_eq!(
        payouts(&p, &m, Settlement::Approval, 100).unwrap(),
        (10, 0, MilestoneStatus::Approved)
    );
    err(
        payouts(&project(1), &m, Settlement::Approval, 100),
        "NotFunded",
    );
}

#[test]
fn auto_release_checks_exact_unlock_and_overflow() {
    let p = funded(&[10]);
    let mut m = milestone(10);
    m.submit("uri".into(), 100).unwrap();
    err(payouts(&p, &m, Settlement::AutoRelease, 3699), "TooEarly");
    assert_eq!(
        payouts(&p, &m, Settlement::AutoRelease, 3700).unwrap().0,
        10
    );
    m.submitted_at = i64::MAX;
    err(
        payouts(&p, &m, Settlement::AutoRelease, i64::MAX),
        "MathOverflow",
    );
}

#[test]
fn refund_rejects_unfunded_and_exact_deadline() {
    let p = funded(&[10]);
    let m = milestone(10);
    err(
        payouts(&project(1), &m, Settlement::Refund, 201),
        "NotFunded",
    );
    err(payouts(&p, &m, Settlement::Refund, 200), "NotOverdue");
    assert_eq!(
        payouts(&p, &m, Settlement::Refund, 201).unwrap(),
        (0, 10, MilestoneStatus::Refunded)
    );
}

#[test]
fn dispute_blocks_every_non_arbitration_settlement() {
    let p = funded(&[10]);
    let mut m = milestone(10);
    m.submit("uri".into(), 100).unwrap();
    m.dispute().unwrap();
    for kind in [
        Settlement::Approval,
        Settlement::AutoRelease,
        Settlement::Refund,
    ] {
        err(payouts(&p, &m, kind, 9999), "InvalidMilestoneState");
    }
    assert_eq!(
        payouts(&p, &m, Settlement::Arbitration(7000), 9999).unwrap(),
        (7, 3, MilestoneStatus::Resolved)
    );
}

#[test]
fn arbitration_rounding_conserves_every_base_unit_even_at_u64_max() {
    for amount in [1, 3, 10001, 1_000_000_000, u64::MAX] {
        for bps in 0..=10_000 {
            let (seller, buyer) = split(amount, bps).unwrap();
            assert_eq!(seller.checked_add(buyer), Some(amount));
            assert_eq!(
                u128::from(seller),
                u128::from(amount) * u128::from(bps) / 10_000
            );
        }
    }
    assert_eq!(split(3, 3333).unwrap(), (0, 3));
    err(split(10, 10001), "InvalidBps");
}

#[test]
fn mixed_settlements_complete_only_after_all_amounts_are_processed() {
    let mut p = funded(&[10, 20, 30]);
    let mut a = milestone(10);
    a.submit("uri".into(), 100).unwrap();
    assert!(!record(&mut p, &mut a, 10, 0, MilestoneStatus::Approved).unwrap());
    let mut b = milestone(20);
    assert!(!record(&mut p, &mut b, 0, 20, MilestoneStatus::Refunded).unwrap());
    let mut c = milestone(30);
    c.submit("uri".into(), 100).unwrap();
    c.dispute().unwrap();
    assert!(record(&mut p, &mut c, 21, 9, MilestoneStatus::Resolved).unwrap());
    assert_eq!(p.status, ProjectStatus::Completed);
    assert_eq!(
        (
            p.settled_amount,
            p.seller_paid_amount,
            p.buyer_refunded_amount,
            p.settled_count
        ),
        (60, 31, 29, 3)
    );
}

#[test]
fn duplicate_or_unbalanced_settlement_is_rejected_without_mutation() {
    let mut p = funded(&[10, 10]);
    let mut m = milestone(10);
    m.submit("uri".into(), 100).unwrap();
    err(
        record(&mut p, &mut m, 10, 1, MilestoneStatus::Approved),
        "InvalidAccounting",
    );
    assert_eq!(p.settled_amount, 0);
    record(&mut p, &mut m, 10, 0, MilestoneStatus::Approved).unwrap();
    err(
        record(&mut p, &mut m, 10, 0, MilestoneStatus::Approved),
        "InvalidMilestoneState",
    );
    assert_eq!((p.settled_amount, p.settled_count), (10, 1));
}
