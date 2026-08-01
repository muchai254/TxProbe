// OP_RETURN detection heuristic

use crate::script::{extract_op_return_payload, op_return_protocol_raw};
use crate::tx::ParsedTx;
use serde_json::{json, Value};

use super::common::{is_spendable, not_detected};

// Detect OP_RETURN outputs and classify the embedded protocol.
pub fn detect_op_return(tx: &ParsedTx) -> Value {
    let first_op_return = tx
        .outputs
        .iter()
        .enumerate()
        .find(|(_, o)| !is_spendable(o));

    match first_op_return {
        None => not_detected(),
        Some((idx, out)) => {
            let protocol = op_return_protocol_raw(&out.script_pubkey);
            let payload = extract_op_return_payload(&out.script_pubkey);
            json!({
                "detected": true,
                "output_index": idx,
                "protocol": protocol,
                "payload_size": payload.len(),
            })
        }
    }
}
