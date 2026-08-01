// Address reuse detection heuristic

use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

use super::analysis::TxContext;
use super::common::is_spendable;

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;

    // Build script_counts from: output scripts + input prevout scripts (for intra-tx reuse).
    let mut script_counts: HashMap<Vec<u8>, usize> = HashMap::new();
    for out in &tx.outputs {
        if !out.script_pubkey.is_empty() && is_spendable(out) {
            *script_counts.entry(out.script_pubkey.clone()).or_insert(0) += 1;
        }
    }
    for script in &ctx.input_scripts {
        if !script.is_empty() {
            *script_counts.entry(script.clone()).or_insert(0) += 1;
        }
    }

    let input_script_set: HashSet<&Vec<u8>> = ctx.input_scripts.iter().collect();

    let detected = !ctx.is_coinbase
        && tx.outputs.iter().any(|o| {
            !o.script_pubkey.is_empty()
                && is_spendable(o)
                && (*script_counts.get(&o.script_pubkey).unwrap_or(&0) > 1
                    || input_script_set.contains(&o.script_pubkey))
        });

    json!({ "detected": detected })
}
