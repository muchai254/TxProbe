// Unnecessary inputs detection heuristic

use serde_json::{json, Value};

use super::common::not_detected;
use super::analysis::TxContext;

pub fn detect_unnecessary_inputs(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if ctx.is_coinbase {
        return not_detected();
    }

    if ctx.input_values.is_empty() {
        return not_detected();
    }

    if tx.inputs.len() != ctx.input_values.len() {
        return not_detected();
    }

    if tx.inputs.len() < 2 {
        return not_detected();
    }

    let total_inputs: u64 = ctx.input_values.iter().sum();
    let total_outputs: u64 = tx.outputs.iter().map(|o| o.value).sum();

    if total_inputs < total_outputs {
        return not_detected();
    }

    let mut unnecessary: Vec<usize> = Vec::new();
    for (i, &inp_val) in ctx.input_values.iter().enumerate() {
        let remaining = total_inputs.saturating_sub(inp_val);
        if remaining >= total_outputs {
            unnecessary.push(i);
        }
    }

    if unnecessary.is_empty() {
        return not_detected();
    }

    let unnecessary_count = unnecessary.len();
    let total_count = tx.inputs.len();

    let confidence = if unnecessary_count >= 2 || (unnecessary_count == 1 && total_count >= 4) {
        "high"
    } else if total_count >= 3 {
        "medium"
    } else {
        "low"
    };

    let note = format!(
        "{} of {} inputs could be removed without underfunding the outputs \
         (total_in={} sat, total_out={} sat)",
        unnecessary_count, total_count, total_inputs, total_outputs
    );

    json!({
        "detected": true,
        "unnecessary_input_indices": unnecessary,
        "confidence": confidence,
        "note": note,
    })
}
