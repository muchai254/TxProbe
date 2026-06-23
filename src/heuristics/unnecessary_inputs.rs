// Unnecessary inputs detection heuristic

use crate::tx::ParsedTx;
use serde_json::{json, Value};

pub fn detect_unnecessary_inputs(tx: &ParsedTx, is_coinbase: bool) -> Value {
    if is_coinbase {
        return json!({ "detected": false });
    }

    if tx.input_values.is_empty() {
        return json!({ "detected": false });
    }

    if tx.inputs.len() != tx.input_values.len() {
        return json!({ "detected": false });
    }

    if tx.inputs.len() < 2 {
        return json!({ "detected": false });
    }

    let total_inputs: u64 = tx.input_values.iter().sum();
    let total_outputs: u64 = tx.outputs.iter().map(|o| o.value).sum();

    if total_inputs < total_outputs {
        return json!({ "detected": false });
    }

    let mut unnecessary: Vec<usize> = Vec::new();
    for (i, &inp_val) in tx.input_values.iter().enumerate() {
        let remaining = total_inputs.saturating_sub(inp_val);
        if remaining >= total_outputs {
            unnecessary.push(i);
        }
    }

    if unnecessary.is_empty() {
        return json!({ "detected": false });
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
