// Peeling chain detection heuristic

use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::{not_detected, spendable_values};

pub fn detect(ctx: &TxContext) -> Value {
    // A 1-input, 2-output coinbase would otherwise match the shape checked below —
    // this used to be excluded by the caller instead of here.
    if ctx.is_coinbase || ctx.tx.inputs.len() > 2 || ctx.spendable_out_count != 2 {
        return not_detected();
    }

    let values = spendable_values(ctx.tx);

    if values.len() != 2 {
        return not_detected();
    }

    let (min_val, max_val) = if values[0] < values[1] {
        (values[0], values[1])
    } else {
        (values[1], values[0])
    };

    json!({ "detected": min_val > 0 && max_val / min_val >= 10 })
}
