// Common Input Ownership Heuristic (CIOH) detection

use serde_json::{json, Value};

use super::analysis::TxContext;

pub fn detect(ctx: &TxContext) -> Value {
    json!({ "detected": !ctx.is_coinbase && ctx.tx.inputs.len() > 1 })
}
