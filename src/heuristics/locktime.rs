// Locktime analysis heuristic

use crate::tx::ParsedTx;
use serde_json::{json, Value};

pub fn detect_locktime_analysis(tx: &ParsedTx, is_coinbase: bool, block_height: i64) -> Value {
    if is_coinbase {
        return json!({ "detected": false });
    }

    let locktime = tx.locktime;

    let locktime_type = if locktime == 0 {
        "none"
    } else if locktime < 500_000_000 {
        "block_height"
    } else {
        "unix_timestamp"
    };

    let anti_fee_sniping =
        locktime_type == "block_height" && block_height > 0 && locktime as i64 == block_height - 1;

    let rbf_signaling = tx.inputs.iter().any(|inp| inp.sequence < 0xFFFFFFFE);

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
