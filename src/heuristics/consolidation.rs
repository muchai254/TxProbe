// Consolidation detection heuristic

use serde_json::{json, Value};

use super::analysis::TxContext;

pub fn detect(ctx: &TxContext) -> Value {
    let detected = !ctx.is_coinbase && ctx.tx.inputs.len() >= 3 && ctx.spendable_out_count <= 2;
    json!({ "detected": detected })
}
