// Analysis primitives shared across heuristic detectors.

use crate::script::classify_script;
use crate::tx::{ParsedTx, TxOutput};
use serde_json::{json, Value};

// An output counts as spendable unless it is OP_RETURN (data-carrying, unspendable by consensus).
pub fn is_spendable(output: &TxOutput) -> bool {
    classify_script(&output.script_pubkey) != "op_return"
}

// Values of all spendable outputs, in output order.
pub fn spendable_values(tx: &ParsedTx) -> Vec<u64> {
    tx.outputs
        .iter()
        .filter(|o| is_spendable(o))
        .map(|o| o.value)
        .collect()
}

pub fn not_detected() -> Value {
    json!({ "detected": false })
}

// Reads a detector's "detected" field without the panic `Value`'s `[]` index
// operator raises on a non-object.
pub fn detected(result: &Value) -> bool {
    result.get("detected").and_then(Value::as_bool).unwrap_or(false)
}

// The vout Bitcoin Core assigns to a coinbase input's (nonexistent) prevout.
pub const COINBASE_VOUT: u32 = 0xFFFFFFFF;

// BIP125: an input sequence below this signals the transaction opts in to replace-by-fee.
pub const SEQUENCE_RBF_THRESHOLD: u32 = 0xFFFFFFFE;

pub fn signals_rbf(tx: &ParsedTx) -> bool {
    tx.inputs
        .iter()
        .any(|inp| inp.sequence < SEQUENCE_RBF_THRESHOLD)
}

// BIP113: locktime values at or above this are a Unix timestamp rather than a block height.
pub const LOCKTIME_TIMESTAMP_THRESHOLD: u32 = 500_000_000;

// Minimum economically spendable output value, by script type.
pub const DUST_FLOOR_P2WPKH_P2TR_SATS: u64 = 294;
pub const DUST_FLOOR_P2WSH_SATS: u64 = 330;
pub const DUST_FLOOR_LEGACY_SATS: u64 = 546;
