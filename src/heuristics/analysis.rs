// Single-transaction analysis orchestrator for txprobe-analyzer.
// Unlike Sherlock's shared.rs (the ancestor block-scanning project's module this
// one is named after), this module accepts a single ParsedTx plus prevout data
// fetched from mempool.space.

use crate::address::address_from_script;
use crate::crypto::hex_rev;
use crate::script::classify_script;
use crate::tx::ParsedTx;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

use super::classification::{classify_tx, compute_privacy_score, infer_input_script_type};
use super::common::{detected, is_spendable, not_detected, signals_rbf, COINBASE_VOUT};
use super::HEURISTICS;

#[derive(Debug, Deserialize, Serialize)]
pub struct PrevoutEntry {
    pub value: u64,
    pub scriptpubkey: String, // hex-encoded
}

// Prevout-enriched facts about a transaction, computed once and shared across detectors.
// `tx` never carries this data itself — it is looked up from prevouts fetched separately.
pub struct TxContext<'a> {
    pub tx: &'a ParsedTx,
    pub input_values: Vec<u64>,
    pub input_scripts: Vec<Vec<u8>>,
    pub is_coinbase: bool,
    pub spendable_out_count: usize,
    pub fee: u64,
    pub weight: u64,
    pub vbytes: u64,
}

impl<'a> TxContext<'a> {
    pub fn new(tx: &'a ParsedTx, prevouts: &[PrevoutEntry]) -> Self {
        let input_values: Vec<u64> = prevouts.iter().map(|p| p.value).collect();
        let input_scripts: Vec<Vec<u8>> = prevouts
            .iter()
            .map(|p| hex::decode(&p.scriptpubkey).unwrap_or_default())
            .collect();

        let is_coinbase = tx.inputs.len() == 1
            && tx.inputs[0].txid_bytes == [0u8; 32]
            && tx.inputs[0].vout == COINBASE_VOUT;

        let spendable_out_count = tx.outputs.iter().filter(|o| is_spendable(o)).count();

        let weight = (tx.base_size as u64) * 4 + (tx.witness_size as u64);
        let vbytes = (weight + 3) / 4;

        // Fee = sum(prevout values) - sum(output values)
        let total_in: u64 = input_values.iter().sum();
        let total_out: u64 = tx.outputs.iter().map(|o| o.value).sum();
        let fee = if !is_coinbase && total_in >= total_out {
            total_in - total_out
        } else {
            0u64
        };

        TxContext {
            tx,
            input_values,
            input_scripts,
            is_coinbase,
            spendable_out_count,
            fee,
            weight,
            vbytes,
        }
    }
}

// Every heuristic's output (in HEURISTICS order), plus the classification and
// privacy score derived from them.
pub struct HeuristicResults {
    pub heuristics: Vec<(&'static str, Value)>,
    pub classification: &'static str,
    pub privacy_score: Option<u8>,
}

// Look up an already-computed detector's result by its registry key. Panics only if
// HEURISTICS is missing an entry a caller here relies on — a build-time bug, not a
// data-dependent one.
fn result_of<'a>(heuristics: &'a [(&'static str, Value)], key: &str) -> &'a Value {
    &heuristics
        .iter()
        .find(|(k, _)| *k == key)
        .unwrap_or_else(|| panic!("no heuristic registered under {key:?}"))
        .1
}

pub fn run_heuristics(ctx: &TxContext) -> HeuristicResults {
    let mut heuristics: Vec<(&'static str, Value)> =
        HEURISTICS.iter().map(|(key, f)| (*key, f(ctx))).collect();

    // A batch of equal-value ordinals/runes postage outputs looks like a CoinJoin
    // mix by value alone — suppress the coinjoin signal when either protocol is present.
    // This depends on `inscription` and `op_return` already being computed above.
    let inscription_detected = detected(result_of(&heuristics, "inscription"));
    let op_return_protocol = result_of(&heuristics, "op_return")
        .get("protocol")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let has_ordinals_context =
        inscription_detected || matches!(op_return_protocol, "runes" | "ordinals" | "brc20");
    if has_ordinals_context {
        if let Some((_, coinjoin_result)) = heuristics.iter_mut().find(|(k, _)| *k == "coinjoin") {
            if detected(coinjoin_result) {
                *coinjoin_result = not_detected();
            }
        }
    }

    let coinjoin_detected = detected(result_of(&heuristics, "coinjoin"));
    let consolidation_detected = detected(result_of(&heuristics, "consolidation"));
    let cioh_detected = detected(result_of(&heuristics, "cioh"));
    let reuse_detected = detected(result_of(&heuristics, "address_reuse"));
    let change_result = result_of(&heuristics, "change_detection").clone();

    let classification = classify_tx(
        ctx.tx,
        ctx.is_coinbase,
        coinjoin_detected,
        consolidation_detected,
        ctx.spendable_out_count,
    );

    let input_script_types: Vec<&str> = ctx
        .tx
        .inputs
        .iter()
        .map(infer_input_script_type)
        .collect();

    let has_mixed_inputs = if input_script_types.len() > 1 {
        let first = input_script_types[0];
        input_script_types.iter().any(|&t| t != first)
    } else {
        false
    };

    let privacy_score = compute_privacy_score(
        ctx.tx,
        ctx.is_coinbase,
        cioh_detected,
        reuse_detected,
        coinjoin_detected,
        has_mixed_inputs,
        &change_result,
    );

    HeuristicResults {
        heuristics,
        classification,
        privacy_score,
    }
}

pub fn build_response(ctx: &TxContext, results: &HeuristicResults) -> Value {
    let tx = ctx.tx;

    let rbf_signaling = signals_rbf(tx);

    let fee_rate_rounded = if !ctx.is_coinbase && ctx.vbytes > 0 {
        let rate = (ctx.fee as f64) / (ctx.vbytes as f64);
        (rate * 100.0).round() / 100.0
    } else {
        0.0
    };

    // Build enriched inputs array with addresses.
    let inputs_json: Vec<Value> = tx
        .inputs
        .iter()
        .enumerate()
        .map(|(i, inp)| {
            let script_type = infer_input_script_type(inp);
            let value_sats = ctx.input_values.get(i).copied().unwrap_or(0);
            let prevout_script = ctx.input_scripts.get(i).cloned().unwrap_or_default();
            let address = address_from_script(&prevout_script).unwrap_or_default();
            json!({
                "index": i,
                "script_type": script_type,
                "value_sats": value_sats,
                "address": address,
            })
        })
        .collect();

    // Build enriched outputs array with addresses.
    let outputs_json: Vec<Value> = tx
        .outputs
        .iter()
        .enumerate()
        .map(|(i, out)| {
            let script_type = classify_script(&out.script_pubkey);
            let address = address_from_script(&out.script_pubkey);
            json!({
                "index": i,
                "script_type": script_type,
                "value_sats": out.value,
                "address": address,
            })
        })
        .collect();

    let heuristics_json: Map<String, Value> = results
        .heuristics
        .iter()
        .map(|(key, value)| (key.to_string(), value.clone()))
        .collect();

    json!({
        "txid": hex_rev(&tx.txid),
        "version": tx.version,
        "locktime": tx.locktime,
        "is_segwit": tx.is_segwit,
        "rbf_signaling": rbf_signaling,
        "weight": ctx.weight,
        "vbytes": ctx.vbytes,
        "fee_sats": ctx.fee,
        "fee_rate_sat_vb": fee_rate_rounded,
        "input_count": tx.inputs.len(),
        "output_count": tx.outputs.len(),
        "inputs": inputs_json,
        "outputs": outputs_json,
        "heuristics": heuristics_json,
        "classification": results.classification,
        "privacy_score": results.privacy_score.unwrap_or(0),
    })
}

pub fn analyze_single_tx(tx: &ParsedTx, prevouts: &[PrevoutEntry]) -> Value {
    let ctx = TxContext::new(tx, prevouts);
    let results = run_heuristics(&ctx);
    build_response(&ctx, &results)
}
