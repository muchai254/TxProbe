// Single-transaction analysis orchestrator for txprobe-analyzer.
// Unlike Sherlock's shared.rs (the ancestor block-scanning project's module this
// one is named after), this module accepts a single ParsedTx plus prevout data
// fetched from mempool.space.

use crate::address::address_from_script;
use crate::crypto::hex_rev;
use crate::script::classify_script;
use crate::tx::ParsedTx;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

use super::batch_payment::detect_batch_payment;
use super::change_detection::detect_change;
use super::classification::{classify_tx, compute_privacy_score, infer_input_script_type};
use super::coinjoin::detect_coinjoin;
use super::common::{detected, is_spendable, not_detected, signals_rbf, COINBASE_VOUT};
use super::inscription::detect_witness_inscription;
use super::locktime::detect_locktime_analysis;
use super::op_return::detect_op_return;
use super::peeling_chain::detect_peeling_chain;
use super::round_payment::detect_round_payment;
use super::script_type_upgrade::detect_script_type_upgrade;
use super::unnecessary_inputs::detect_unnecessary_inputs;

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

// Detection results for every heuristic, plus the classification and privacy score
// derived from them.
pub struct HeuristicResults {
    pub cioh_detected: bool,
    pub change_result: Value,
    pub reuse_detected: bool,
    pub coinjoin_result: Value,
    pub consolidation_detected: bool,
    pub self_transfer_detected: bool,
    pub peeling_chain_detected: bool,
    pub op_return_result: Value,
    pub round_payment_result: Value,
    pub locktime_result: Value,
    pub inscription_result: Value,
    pub unnecessary_input_result: Value,
    pub script_upgrade_result: Value,
    pub batch_payment_result: Value,
    pub classification: &'static str,
    pub privacy_score: Option<u8>,
}

pub fn run_heuristics(ctx: &TxContext) -> HeuristicResults {
    let tx = ctx.tx;
    let is_coinbase = ctx.is_coinbase;
    let spendable_out_count = ctx.spendable_out_count;

    let cioh_detected = !is_coinbase && tx.inputs.len() > 1;

    let change_result = detect_change(ctx);

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

    let input_script_set: std::collections::HashSet<&Vec<u8>> = ctx.input_scripts.iter().collect();

    let reuse_detected = !is_coinbase
        && tx.outputs.iter().any(|o| {
            !o.script_pubkey.is_empty()
                && is_spendable(o)
                && (*script_counts.get(&o.script_pubkey).unwrap_or(&0) > 1
                    || input_script_set.contains(&o.script_pubkey))
        });

    let coinjoin_result = if !is_coinbase {
        detect_coinjoin(tx)
    } else {
        not_detected()
    };
    let coinjoin_detected = detected(&coinjoin_result);

    let consolidation_detected = !is_coinbase && tx.inputs.len() >= 3 && spendable_out_count <= 2;

    let self_transfer_detected = !is_coinbase && tx.inputs.len() == 1 && spendable_out_count == 1;

    let peeling_chain_detected = !is_coinbase && detect_peeling_chain(tx, spendable_out_count);

    let op_return_result = detect_op_return(tx);

    let round_payment_result = detect_round_payment(tx, is_coinbase);

    let locktime_result = detect_locktime_analysis(tx, is_coinbase, 0);

    let inscription_result = detect_witness_inscription(tx);

    let inscription_detected = detected(&inscription_result);
    let op_return_protocol = op_return_result
        .get("protocol")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    // A batch of equal-value ordinals/runes postage outputs looks like a CoinJoin
    // mix by value alone — suppress the coinjoin signal when either protocol is present.
    let has_ordinals_context =
        inscription_detected || matches!(op_return_protocol, "runes" | "ordinals" | "brc20");
    let (coinjoin_result, coinjoin_detected) = if coinjoin_detected && has_ordinals_context {
        (not_detected(), false)
    } else {
        (coinjoin_result, coinjoin_detected)
    };

    let unnecessary_input_result = detect_unnecessary_inputs(ctx);

    let script_upgrade_result = detect_script_type_upgrade(tx, is_coinbase);

    let batch_payment_result = detect_batch_payment(tx, is_coinbase, spendable_out_count);

    let classification = classify_tx(
        tx,
        is_coinbase,
        coinjoin_detected,
        consolidation_detected,
        spendable_out_count,
    );

    let input_script_types: Vec<&str> = tx
        .inputs
        .iter()
        .map(|inp| infer_input_script_type(inp))
        .collect();

    let has_mixed_inputs = if input_script_types.len() > 1 {
        let first = input_script_types[0];
        input_script_types.iter().any(|&t| t != first)
    } else {
        false
    };

    let privacy_score = compute_privacy_score(
        tx,
        is_coinbase,
        cioh_detected,
        reuse_detected,
        coinjoin_detected,
        has_mixed_inputs,
        &change_result,
    );

    HeuristicResults {
        cioh_detected,
        change_result,
        reuse_detected,
        coinjoin_result,
        consolidation_detected,
        self_transfer_detected,
        peeling_chain_detected,
        op_return_result,
        round_payment_result,
        locktime_result,
        inscription_result,
        unnecessary_input_result,
        script_upgrade_result,
        batch_payment_result,
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
        "heuristics": {
            "cioh":                 { "detected": results.cioh_detected },
            "change_detection":     results.change_result.clone(),
            "address_reuse":        { "detected": results.reuse_detected },
            "coinjoin":             results.coinjoin_result.clone(),
            "consolidation":        { "detected": results.consolidation_detected },
            "self_transfer":        { "detected": results.self_transfer_detected },
            "peeling_chain":        { "detected": results.peeling_chain_detected },
            "op_return":            results.op_return_result.clone(),
            "round_number_payment": results.round_payment_result.clone(),
            "locktime_analysis":    results.locktime_result.clone(),
            "inscription":          results.inscription_result.clone(),
            "unnecessary_input":    results.unnecessary_input_result.clone(),
            "script_type_upgrade":  results.script_upgrade_result.clone(),
            "batch_payment":        results.batch_payment_result.clone(),
        },
        "classification": results.classification,
        "privacy_score": results.privacy_score.unwrap_or(0),
    })
}

pub fn analyze_single_tx(tx: &ParsedTx, prevouts: &[PrevoutEntry]) -> Value {
    let ctx = TxContext::new(tx, prevouts);
    let results = run_heuristics(&ctx);
    build_response(&ctx, &results)
}
