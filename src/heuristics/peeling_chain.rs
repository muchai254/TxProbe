// Peeling chain detection heuristic

use crate::script::classify_script;
use crate::tx::ParsedTx;

pub fn detect_peeling_chain(tx: &ParsedTx, spendable_out_count: usize) -> bool {
    if tx.inputs.len() > 2 || spendable_out_count != 2 {
        return false;
    }

    let values: Vec<u64> = tx
        .outputs
        .iter()
        .filter(|o| classify_script(&o.script_pubkey) != "op_return")
        .map(|o| o.value)
        .collect();

    if values.len() != 2 {
        return false;
    }

    let (min_val, max_val) = if values[0] < values[1] {
        (values[0], values[1])
    } else {
        (values[1], values[0])
    };

    min_val > 0 && max_val / min_val >= 10
}
