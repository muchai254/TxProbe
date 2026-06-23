// Batch payment detection heuristic

use crate::script::classify_script;
use crate::tx::ParsedTx;
use serde_json::{json, Value};

/// Detect batch payment: tx has 3+ spendable outputs and is not a coinjoin/consolidation.
/// Reports output_count and distinct_script_types as diversity signal.
pub fn detect_batch_payment(tx: &ParsedTx, is_coinbase: bool, spendable_out_count: usize) -> Value {
    if is_coinbase || spendable_out_count < 3 {
        return json!({ "detected": false });
    }

    let mut type_set: std::collections::HashSet<&'static str> =
        std::collections::HashSet::new();
    for out in &tx.outputs {
        let stype = classify_script(&out.script_pubkey);
        if stype != "op_return" {
            type_set.insert(stype);
        }
    }
    let distinct_script_types = type_set.len();

    json!({
        "detected": true,
        "output_count": spendable_out_count,
        "distinct_script_types": distinct_script_types,
    })
}
