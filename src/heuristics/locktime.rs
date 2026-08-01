// Locktime analysis heuristic

use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::{not_detected, signals_rbf, LOCKTIME_TIMESTAMP_THRESHOLD};

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if ctx.is_coinbase {
        return not_detected();
    }

    let locktime = tx.locktime;

    let locktime_type = if locktime == 0 {
        "none"
    } else if locktime < LOCKTIME_TIMESTAMP_THRESHOLD {
        "block_height"
    } else {
        "unix_timestamp"
    };

    // block_height is never wired in from the caller (hard-coded to 0), so
    // anti_fee_sniping can never be true. See plan.md appendix item 1.
    let block_height: i64 = 0;
    let anti_fee_sniping =
        locktime_type == "block_height" && block_height > 0 && locktime as i64 == block_height - 1;

    let rbf_signaling = signals_rbf(tx);

    let wallet_fingerprint = if anti_fee_sniping && rbf_signaling {
        "anti_fee_sniping_rbf"
    } else if anti_fee_sniping {
        "anti_fee_sniping"
    } else if rbf_signaling {
        "rbf_only"
    } else if locktime_type != "none" {
        "custom_locktime"
    } else {
        "no_fingerprint"
    };

    let detected = locktime_type != "none" || rbf_signaling;

    json!({
        "detected": detected,
        "locktime": locktime,
        "locktime_type": locktime_type,
        "anti_fee_sniping": anti_fee_sniping,
        "rbf_signaling": rbf_signaling,
        "wallet_fingerprint": wallet_fingerprint,
    })
}
