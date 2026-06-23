// OP_RETURN detection heuristic

use crate::script::{classify_script, extract_op_return_payload, op_return_protocol_raw};
use crate::tx::ParsedTx;
use serde_json::{json, Value};

// Detect OP_RETURN outputs and classify the embedded protocol.
pub fn detect_op_return(tx: &ParsedTx) -> Value {
    let first_op_return = tx
        .outputs
        .iter()
        .enumerate()
        .find(|(_, o)| classify_script(&o.script_pubkey) == "op_return");

    match first_op_return {
        None => json!({ "detected": false }),
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
