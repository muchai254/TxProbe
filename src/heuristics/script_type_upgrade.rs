// Script type upgrade detection heuristic

use crate::script::classify_script;
use serde_json::{json, Value};

use super::analysis::TxContext;
use super::classification::infer_input_script_type;
use super::common::not_detected;

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if ctx.is_coinbase || tx.inputs.is_empty() || tx.outputs.is_empty() {
        return not_detected();
    }

    const SEGWIT_NATIVE: &[&str] = &["p2wpkh", "p2wsh", "p2tr"];

    let all_legacy = tx
        .inputs
        .iter()
        .all(|inp| !SEGWIT_NATIVE.contains(&infer_input_script_type(inp)));

    if !all_legacy {
        return not_detected();
    }

    let mut to_types: Vec<&str> = Vec::new();
    for out in &tx.outputs {
        let t = classify_script(&out.script_pubkey);
        if SEGWIT_NATIVE.contains(&t) && !to_types.contains(&t) {
            to_types.push(t);
        }
    }

    if to_types.is_empty() {
        return not_detected();
    }
    to_types.sort_unstable();

    let mut from_types: Vec<&str> = Vec::new();
    for inp in &tx.inputs {
        let t = infer_input_script_type(inp);
        if !from_types.contains(&t) {
            from_types.push(t);
        }
    }
    from_types.sort_unstable();

    json!({
        "detected": true,
        "from_types": from_types,
        "to_types": to_types,
    })
}
