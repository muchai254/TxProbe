mod address_reuse;
mod analysis;
mod batch_payment;
mod change_detection;
mod cioh;
mod classification;
mod coinjoin;
mod coinjoin_undone;
mod common;
mod consolidation;
mod context;
mod inscription;
mod locktime;
mod op_return;
mod peeling_chain;
mod round_number_payment;
mod script_type_upgrade;
mod self_transfer;
mod unnecessary_input;

pub use analysis::{analyze_single_tx, PrevoutEntry};
pub use context::TxGraphContext;

use analysis::TxContext;
use serde_json::Value;

type HeuristicFn = fn(&TxContext) -> Value;

// Every heuristic detector, keyed by its JSON output field name. This is the single
// place the id/module/JSON-key association is made — see plan.md Step 1.5.
const HEURISTICS: &[(&str, HeuristicFn)] = &[
    ("cioh", cioh::detect),
    ("change_detection", change_detection::detect),
    ("address_reuse", address_reuse::detect),
    ("coinjoin", coinjoin::detect),
    ("coinjoin_undone", coinjoin_undone::detect),
    ("consolidation", consolidation::detect),
    ("self_transfer", self_transfer::detect),
    ("peeling_chain", peeling_chain::detect),
    ("op_return", op_return::detect),
    ("round_number_payment", round_number_payment::detect),
    ("locktime_analysis", locktime::detect),
    ("inscription", inscription::detect),
    ("unnecessary_input", unnecessary_input::detect),
    ("script_type_upgrade", script_type_upgrade::detect),
    ("batch_payment", batch_payment::detect),
];
