// Change detection heuristic

use crate::script::classify_script;
use crate::varint::compact_size_len;
use serde_json::{json, Value};

use super::analysis::TxContext;
use super::classification::{dominant_input_type, is_bip69_sorted};
use super::common::{
    is_spendable, not_detected, DUST_FLOOR_LEGACY_SATS, DUST_FLOOR_P2WPKH_P2TR_SATS,
    DUST_FLOOR_P2WSH_SATS,
};

pub fn detect(ctx: &TxContext) -> Value {
    let tx = ctx.tx;
    let (is_coinbase, fee, vbytes) = (ctx.is_coinbase, ctx.fee, ctx.vbytes);
    if is_coinbase || tx.inputs.is_empty() || tx.outputs.is_empty() {
        return not_detected();
    }

    let spendable: Vec<(usize, &crate::tx::TxOutput)> = tx
        .outputs
        .iter()
        .enumerate()
        .filter(|(_, o)| is_spendable(o))
        .collect();

    if spendable.len() < 2 {
        return not_detected();
    }

    let bip69 = is_bip69_sorted(tx);
    let dominant_type = dominant_input_type(tx);
    let last_out_idx = tx.outputs.len() - 1;

    let mut best_idx: Option<usize> = None;
    let mut best_score: f64 = 0.0;
    let mut best_signals: Vec<&'static str> = vec![];

    for (ci, (cand_idx, cand_out)) in spendable.iter().enumerate() {
        let others: Vec<&crate::tx::TxOutput> = spendable
            .iter()
            .enumerate()
            .filter(|(oi, _)| *oi != ci)
            .map(|(_, (_, o))| *o)
            .collect();

        let mut score: f64 = 0.0;
        let mut signals: Vec<&'static str> = vec![];

        let cand_type = classify_script(&cand_out.script_pubkey);
        if dominant_type != "unknown" && cand_type == dominant_type {
            score += 0.35;
            signals.push("script_type_matches_inputs");
        }

        let cand_is_round = cand_out.value > 0 && cand_out.value % 10_000 == 0;
        let others_all_round = others.iter().all(|o| o.value > 0 && o.value % 10_000 == 0);
        if !cand_is_round && others_all_round {
            score += 0.25;
            signals.push("payment_is_round_change_is_not");
        }

        let max_other = others.iter().map(|o| o.value).max().unwrap_or(0);
        if cand_out.value < max_other {
            score += 0.20;
            signals.push("change_value_smaller_than_payment");
        }

        if !bip69 && (*cand_idx == 0 || *cand_idx == last_out_idx) {
            score += 0.15;
            signals.push("typical_change_position");
        }

        if bip69 {
            score += 0.05;
            signals.push("bip69_consistent");
        }

        if fee > 0 && vbytes > 0 {
            let fee_rate = fee as f64 / vbytes as f64;

            let slen = cand_out.script_pubkey.len() as u64;
            let csz = compact_size_len(slen) as u64;
            let out_vbytes = 8u64 + csz + slen;
            let marginal_cost = fee_rate * out_vbytes as f64;

            let dust = match cand_type {
                "p2wpkh" | "p2tr" => DUST_FLOOR_P2WPKH_P2TR_SATS,
                "p2wsh" => DUST_FLOOR_P2WSH_SATS,
                _ => DUST_FLOOR_LEGACY_SATS,
            };
            let floor = dust.max(marginal_cost.ceil() as u64);

            if cand_out.value < floor {
                score = f64::max(0.0, score - 0.25);
                signals.push("sub_economic_change");
            } else if (cand_out.value as f64) < marginal_cost * 2.0 {
                score = f64::max(0.0, score - 0.10);
                signals.push("near_fee_threshold");
            }
        }

        if score > best_score {
            best_score = score;
            best_idx = Some(*cand_idx);
            best_signals = signals;
        }
    }

    if best_score < 0.20 || best_idx.is_none() {
        return not_detected();
    }

    let confidence = if best_score >= 0.75 {
        "high"
    } else if best_score >= 0.45 {
        "medium"
    } else {
        "low"
    };

    let score_rounded = (best_score * 100.0).round() / 100.0;

    let method = match best_signals.first().copied() {
        Some("script_type_matches_inputs") => "script_type_match",
        Some("payment_is_round_change_is_not") => "round_number",
        Some("change_value_smaller_than_payment") => "value_analysis",
        Some("typical_change_position") => "output_ordering",
        Some("bip69_consistent") => "bip69_ordering",
        Some("sub_economic_change") => "fee_boundary",
        Some("near_fee_threshold") => "fee_boundary",
        _ => "unknown",
    };

    let fee_constrained = best_signals.contains(&"sub_economic_change")
        || best_signals.contains(&"near_fee_threshold");

    json!({
        "detected": true,
        "likely_change_index": best_idx.unwrap(),
        "method": method,
        "confidence": confidence,
        "confidence_score": score_rounded,
        "contributing_signals": best_signals,
        "fee_constrained": fee_constrained,
    })
}
