// CoinJoin detection heuristic

use serde_json::{json, Value};
use std::collections::HashMap;

use super::analysis::TxContext;
use super::common::{not_detected, spendable_values};

// Minimum denomination for a valid CoinJoin mixing output.

pub const COINJOIN_MIN_DENOM_SATS: u64 = 10_000;

// The (denomination, count) of the most repeated equal-value output above the
// minimum, if the shape looks like a CoinJoin. Shared with coinjoin_undone,
// which applies it to parent transactions known only by their summaries.
pub fn mixing_denomination(input_count: usize, values: &[u64]) -> Option<(u64, usize)> {
    if input_count < 3 || values.len() < 2 {
        return None;
    }

    let mut counts: HashMap<u64, usize> = HashMap::new();
    for v in values {
        *counts.entry(*v).or_insert(0) += 1;
    }

    counts
        .iter()
        .filter(|(&v, &c)| c >= 2 && v > COINJOIN_MIN_DENOM_SATS)
        // Ties go to the larger value so the result doesn't depend on HashMap order.
        .max_by_key(|(&v, &c)| (c, v))
        .map(|(&v, &c)| (v, c))
}

pub fn detected_in(ctx: &TxContext) -> bool {
    mixing_denomination(ctx.tx.inputs.len(), &spendable_values(ctx.tx)).is_some()
}

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    let values = spendable_values(tx);

    let (mixing_denomination_sats, equal_output_count) =
        match mixing_denomination(tx.inputs.len(), &values) {
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
