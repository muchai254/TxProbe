// Round payment detection heuristic

use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::{is_spendable, not_detected};

const THRESHOLD: u64 = 1_000_000; // 0.01 BTC

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if ctx.is_coinbase || tx.outputs.is_empty() {
        return not_detected();
    }

    let round_indices: Vec<usize> = tx
        .outputs
        .iter()
        .enumerate()
        .filter(|(_, o)| is_spendable(o) && o.value > 0 && o.value % THRESHOLD == 0)
        .map(|(i, _)| i)
        .collect();

    if round_indices.is_empty() {
        return not_detected();
    }

    json!({
        "detected": true,
        "round_output_indices": round_indices,
        "threshold_sats": THRESHOLD,
    })
}
