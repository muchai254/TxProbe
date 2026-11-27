// One-hop transaction graph around the analyzed transaction: the transactions
// that created its inputs, the transactions that spent its outputs, and the
// lifetime history of every address it touches. Supplied by the server; absent
// when the analyzer runs on a bare {raw_tx, prevouts} payload.

use serde::Deserialize;
use std::collections::HashMap;

// Compact description of a neighbouring transaction. Address types use the
// data source's vocabulary (e.g. "witness_v0_keyhash"), and are only ever
// compared against other TxSummary fields, never against ScriptType.
#[derive(Debug, Default, Deserialize)]
pub struct TxSummary {
    pub txid: String,
    pub version: u32,
    pub lock_time: u32,
    pub is_rbf: bool,
    pub input_count: usize,
    // Spendable outputs only, in output order.
    pub output_values: Vec<u64>,
    pub input_addresses: Vec<String>,
    pub input_types: Vec<String>,
}

#[derive(Debug, Default, Deserialize)]
pub struct InputContext {
    pub parent: Option<TxSummary>,
}

#[derive(Debug, Default, Deserialize)]
pub struct OutputContext {
    pub spent_by: Option<TxSummary>,
}

#[derive(Debug, Default, Deserialize)]
pub struct AddressHistory {
    // How many outputs this address has ever received; above 1 means reuse.
    pub output_count: u64,
}

#[derive(Debug, Default, Deserialize)]
pub struct TxGraphContext {
    // The analyzed transaction itself, described in the same vocabulary as its neighbours.
    pub tx: TxSummary,
    // Indexed like the transaction's inputs.
    #[serde(default)]
    pub inputs: Vec<InputContext>,
    // Indexed like the transaction's outputs (including unspendable ones).
    #[serde(default)]
    pub outputs: Vec<OutputContext>,
    #[serde(default)]
    pub addresses: HashMap<String, AddressHistory>,
}
