// Address reuse detection heuristic

use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

use crate::address::address_from_script;

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

    let graph = match ctx.graph {
        Some(g) => g,
        None => return json!({ "detected": detected }),
    };

    // With history available, also flag any address this transaction touches
    // that has received coins more than once over its lifetime.
    let mut seen: HashSet<String> = HashSet::new();
    let mut reused_addresses: Vec<String> = vec![];
    if !ctx.is_coinbase {
        let input_addrs = ctx
            .input_scripts
            .iter()
            .filter_map(|s| address_from_script(s));
        let output_addrs = tx
            .outputs
            .iter()
            .filter(|o| is_spendable(o))
            .filter_map(|o| address_from_script(&o.script_pubkey));
        for addr in input_addrs.chain(output_addrs) {
            if !seen.insert(addr.clone()) {
                continue;
            }
            let count = graph.addresses.get(&addr).map_or(0, |h| h.output_count);
            if count > 1 {
                reused_addresses.push(addr);
            }
        }
    }

    let scope = if detected {
        "transaction"
    } else if !reused_addresses.is_empty() {
        "history"
    } else {
        "none"
    };

    json!({
        "detected": detected || !reused_addresses.is_empty(),
        "scope": scope,
        "reused_addresses": reused_addresses,
    })
}
