// Round payment detection heuristic

use crate::script::classify_script;
use crate::tx::ParsedTx;
use serde_json::{json, Value};

const THRESHOLD: u64 = 1_000_000; // 0.01 BTC

pub fn detect_round_payment(tx: &ParsedTx, is_coinbase: bool) -> Value {
    if is_coinbase || tx.outputs.is_empty() {
        return json!({ "detected": false });
    }

    let round_indices: Vec<usize> = tx
        .outputs
        .iter()
        .enumerate()
        .filter(|(_, o)| {
            classify_script(&o.script_pubkey) != "op_return"
                && o.value > 0
                && o.value % THRESHOLD == 0
        })
        .map(|(i, _)| i)
        .collect();

    if round_indices.is_empty() {
        return json!({ "detected": false });
    }

    json!({
        "detected": true,
        "round_output_indices": round_indices,
        "threshold_sats": THRESHOLD,
    })
}
