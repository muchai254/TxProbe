// CoinJoin undone heuristic: a coin that came out of a CoinJoin is spent
// together with other coins, re-linking what the mix separated. Needs the
// transaction graph context; never fires without it.

use serde_json::{json, Value};

use super::analysis::TxContext;
use super::coinjoin::{self, mixing_denomination};
use super::common::not_detected;

pub fn detect(ctx: &TxContext) -> Value {
    let graph = match ctx.graph {
        Some(g) => g,
        None => return not_detected(),
    };
    if ctx.is_coinbase || ctx.tx.inputs.len() < 2 || coinjoin::detected_in(ctx) {
        return not_detected();
    }

    // An input is a mixed coin when its parent is a CoinJoin and it carries
    // that CoinJoin's equal-output denomination.
    let mut mixed_inputs: Vec<usize> = vec![];
    for (i, input) in graph.inputs.iter().enumerate() {
        let parent = match &input.parent {
            Some(p) => p,
            None => continue,
        };
        let value = ctx.input_values.get(i).copied().unwrap_or(0);
        if let Some((denomination, _)) =
            mixing_denomination(parent.input_count, &parent.output_values)
        {
            if value == denomination {
                mixed_inputs.push(i);
            }
        }
    }

    if mixed_inputs.is_empty() {
        return not_detected();
    }

    let unmixed_input_count = ctx.tx.inputs.len() - mixed_inputs.len();
    let kind = if unmixed_input_count > 0 {
        "mixed_with_unmixed"
    } else {
        "postmix_merge"
    };

    json!({
        "detected": true,
        "kind": kind,
        "mixed_inputs": mixed_inputs,
        "unmixed_input_count": unmixed_input_count,
        "confidence": "high",
    })
}
