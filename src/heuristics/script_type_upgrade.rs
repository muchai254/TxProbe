// Script type upgrade detection heuristic

use crate::script::{classify_script, ScriptType};
use serde_json::{json, Value};

use super::analysis::TxContext;
use super::classification::infer_input_script_type;
use super::common::not_detected;

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    if ctx.is_coinbase || tx.inputs.is_empty() || tx.outputs.is_empty() {
        return not_detected();
    }

    const SEGWIT_NATIVE: &[ScriptType] = &[ScriptType::P2wpkh, ScriptType::P2wsh, ScriptType::P2tr];

    let all_legacy = tx
        .inputs
        .iter()
        .all(|inp| !SEGWIT_NATIVE.contains(&infer_input_script_type(inp)));

    if !all_legacy {
        return not_detected();
    }

    let mut to_types: Vec<ScriptType> = Vec::new();
    for out in &tx.outputs {
        let t = classify_script(&out.script_pubkey);
        if SEGWIT_NATIVE.contains(&t) && !to_types.contains(&t) {
            to_types.push(t);
        }
    }

    if to_types.is_empty() {
        return not_detected();
    }
    // Sort by the wire-format string (not enum declaration order) to keep the JSON
    // array order unchanged from before this was an enum.
    to_types.sort_unstable_by_key(|t| t.as_str());

    let mut from_types: Vec<ScriptType> = Vec::new();
    for inp in &tx.inputs {
        let t = infer_input_script_type(inp);
        if !from_types.contains(&t) {
            from_types.push(t);
        }
    }
    from_types.sort_unstable_by_key(|t| t.as_str());

    json!({
        "detected": true,
        "from_types": from_types,
        "to_types": to_types,
    })
}
