// Transaction classification and script type inference

use crate::script::ScriptType;
use crate::tx::{ParsedTx, TxInput};
use serde_json::Value;
use std::collections::HashMap;

use super::common::signals_rbf;

// Infer the script type an input is spending from witness/scriptSig structure alone.
pub fn infer_input_script_type(input: &TxInput) -> ScriptType {
    let has_witness = !input.witness.is_empty();
    let has_scriptsig = !input.script_sig.is_empty();

    if has_witness && !has_scriptsig {
        // Native segwit or taproot
        let items = &input.witness;
        if items.len() == 1 && (items[0].len() == 64 || items[0].len() == 65) {
            return ScriptType::P2tr; // Taproot keypath: single schnorr signature
        }
        if items.len() == 2 && items[1].len() == 33 {
            return ScriptType::P2wpkh; // DER sig + compressed pubkey
        }
        return ScriptType::P2wsh;
    }
    if has_witness && has_scriptsig {
        // P2SH-wrapped segwit: scriptSig carries the redeem script, witness carries the spend.
        if input.witness.len() == 2 && input.witness[1].len() == 33 {
            return ScriptType::P2shP2wpkh;
        }
        return ScriptType::P2shP2wsh;
    }
    if has_scriptsig {
        return ScriptType::P2pkh;
    }
    ScriptType::Unknown
}

// Return the script type that appears most often across all inputs.
pub fn dominant_input_type(tx: &ParsedTx) -> ScriptType {
    let mut counts: HashMap<ScriptType, usize> = HashMap::new();
    for inp in &tx.inputs {
        let t = infer_input_script_type(inp);
        *counts.entry(t).or_insert(0) += 1;
    }
    counts
        .into_iter()
        .max_by_key(|(_, c)| *c)
        .map(|(t, _)| t)
        .unwrap_or(ScriptType::Unknown)
}

// True when the outputs are sorted by (value ASC, scriptPubKey ASC) per BIP69.
pub fn is_bip69_sorted(tx: &ParsedTx) -> bool {
    let outs = &tx.outputs;
    for i in 1..outs.len() {
        let (v0, s0) = (outs[i - 1].value, &outs[i - 1].script_pubkey);
        let (v1, s1) = (outs[i].value, &outs[i].script_pubkey);
        if v0 > v1 || (v0 == v1 && s0.as_slice() > s1.as_slice()) {
            return false;
        }
    }
    true
}

pub fn classify_tx(
    tx: &ParsedTx,
    is_coinbase: bool,
    coinjoin: bool,
    consolidation: bool,
    spendable_out_count: usize,
) -> &'static str {
    if is_coinbase {
        return "unknown";
    }
    if coinjoin {
        return "coinjoin";
    }
    if consolidation {
        return "consolidation";
    }

    if tx.inputs.len() == 1 && spendable_out_count == 1 {
        return "self_transfer";
    }

    if spendable_out_count >= 3 {
        return "batch_payment";
    }

    if spendable_out_count == 2 {
        return "simple_payment";
    }
    "unknown"
}

/// Compute privacy score based on various signals
pub fn compute_privacy_score(
    tx: &ParsedTx,
    is_coinbase: bool,
    cioh_detected: bool,
    reuse_detected: bool,
    coinjoin_detected: bool,
    has_mixed_inputs: bool,
    change_result: &Value,
) -> Option<u8> {
    if is_coinbase {
        return None;
    }

    let rbf_signaling = signals_rbf(tx);
    let bip69 = is_bip69_sorted(tx);

    let change_confidence = match change_result.get("detected").and_then(|v| v.as_bool()) {
        Some(true) => change_result
            .get("confidence")
            .and_then(|v| v.as_str())
            .unwrap_or("none"),
        _ => "none",
    };

    let mut score: i32 = 100;

    if cioh_detected && !coinjoin_detected {
        score -= 20;
    }
    if has_mixed_inputs {
        score -= 10;
    }
    if reuse_detected {
        score -= 30;
    }
    match change_confidence {
        "high" => score -= 15,
        "medium" => score -= 8,
        "low" => score -= 3,
        _ => {}
    }
    if !bip69 && !coinjoin_detected {
        score -= 5;
    }
    if coinjoin_detected {
        score += 40;
    }
    if rbf_signaling {
        score += 5;
    }

    Some(score.clamp(0, 100) as u8)
}
