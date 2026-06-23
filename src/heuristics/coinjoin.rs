// CoinJoin detection heuristic

use crate::script::classify_script;
use crate::tx::ParsedTx;
use serde_json::{json, Value};
use std::collections::HashMap;

// Minimum denomination for a valid CoinJoin mixing output.

pub const COINJOIN_MIN_DENOM_SATS: u64 = 10_000;

pub fn detect_coinjoin(tx: &ParsedTx) -> Value {
    if tx.inputs.len() < 3 {
        return json!({ "detected": false });
    }

    let values: Vec<u64> = tx
        .outputs
        .iter()
        .filter(|o| classify_script(&o.script_pubkey) != "op_return")
        .map(|o| o.value)
        .collect();

    if values.len() < 2 {
        return json!({ "detected": false });
    }

    let mut counts: HashMap<u64, usize> = HashMap::new();
    for v in &values {
        *counts.entry(*v).or_insert(0) += 1;
    }

    let best = counts
        .iter()
        .filter(|(&v, &c)| c >= 2 && v > COINJOIN_MIN_DENOM_SATS)
        .max_by_key(|(_, &c)| c)
        .map(|(&v, &c)| (v, c));

    let (mixing_denomination_sats, equal_output_count) = match best {
        Some(pair) => pair,
        None => return json!({ "detected": false }),
    };

    let total_input_count = tx.inputs.len();
    let estimated_participants = equal_output_count;

    let confidence = if equal_output_count >= 5 && total_input_count >= 5 {
        "high"
    } else if equal_output_count >= 3 || total_input_count >= 5 {
        "medium"
    } else {
        "low"
    };

    json!({
        "detected": true,
        "mixing_denomination_sats": mixing_denomination_sats,
        "equal_output_count": equal_output_count,
        "estimated_participants": estimated_participants,
        "total_input_count": total_input_count,
        "confidence": confidence,
    })
}
