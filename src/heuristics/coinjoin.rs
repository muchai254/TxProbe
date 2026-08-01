// CoinJoin detection heuristic

use serde_json::{json, Value};
use std::collections::HashMap;

use super::analysis::TxContext;
use super::common::{not_detected, spendable_values};

// Minimum denomination for a valid CoinJoin mixing output.

pub const COINJOIN_MIN_DENOM_SATS: u64 = 10_000;

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if tx.inputs.len() < 3 {
        return not_detected();
    }

    let values = spendable_values(tx);

    if values.len() < 2 {
        return not_detected();
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
        None => return not_detected(),
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
