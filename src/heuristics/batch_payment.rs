// Batch payment detection heuristic

use crate::script::{classify_script, ScriptType};
use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::{is_spendable, not_detected};

/// Detect batch payment: tx has 3+ spendable outputs and is not a coinjoin/consolidation.
/// Reports output_count and distinct_script_types as diversity signal.
pub fn detect(ctx: &TxContext) -> Value {
    if ctx.is_coinbase || ctx.spendable_out_count < 3 {
        return not_detected();
    }

    let mut type_set: std::collections::HashSet<ScriptType> = std::collections::HashSet::new();
    for out in &ctx.tx.outputs {
        if is_spendable(out) {
            type_set.insert(classify_script(&out.script_pubkey));
        }
    }
    let distinct_script_types = type_set.len();

    json!({
        "detected": true,
        "output_count": ctx.spendable_out_count,
        "distinct_script_types": distinct_script_types,
    })
}
