// Script classification, disassembly, and OP_RETURN parsing.

use serde::{Serialize, Serializer};

// A script's shape, covering both output scriptPubKeys (classify_script) and inferred
// input spend types (classification::infer_input_script_type) — the two domains share
// p2pkh/p2wpkh/p2wsh/p2tr/unknown, and each also has members the other never produces.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ScriptType {
    P2pkh,
    P2sh,
    P2wpkh,
    P2wsh,
    P2tr,
    P2shP2wpkh,
    P2shP2wsh,
    OpReturn,
    Unknown,
}

impl ScriptType {
    // The wire-format string — this is the JSON API contract, must not change.
    pub fn as_str(self) -> &'static str {
        match self {
            ScriptType::P2pkh => "p2pkh",
            ScriptType::P2sh => "p2sh",
            ScriptType::P2wpkh => "p2wpkh",
            ScriptType::P2wsh => "p2wsh",
            ScriptType::P2tr => "p2tr",
            ScriptType::P2shP2wpkh => "p2sh-p2wpkh",
            ScriptType::P2shP2wsh => "p2sh-p2wsh",
            ScriptType::OpReturn => "op_return",
            ScriptType::Unknown => "unknown",
        }
    }
}

impl Serialize for ScriptType {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

pub fn classify_script(script: &[u8]) -> ScriptType {
    let len = script.len();
    if len == 25
        && script[0] == 0x76  // OP_DUP
        && script[1] == 0xa9  // OP_HASH160
        && script[2] == 0x14  // push 20 bytes
        && script[23] == 0x88 // OP_EQUALVERIFY
        && script[24] == 0xac
    // OP_CHECKSIG
    {
        return ScriptType::P2pkh;
    }
    if len == 23
        && script[0] == 0xa9  // OP_HASH160
        && script[1] == 0x14  // push 20 bytes
        && script[22] == 0x87
    // OP_EQUAL
    {
        return ScriptType::P2sh;
    }
    if len == 22 && script[0] == 0x00 && script[1] == 0x14 {
        // OP_0 + 20-byte push
        return ScriptType::P2wpkh;
    }
    if len == 34 && script[0] == 0x00 && script[1] == 0x20 {
        // OP_0 + 32-byte push
        return ScriptType::P2wsh;
    }
    if len == 34 && script[0] == 0x51 && script[1] == 0x20 {
        // OP_1 + 32-byte push (Taproot, BIP340/341)
        return ScriptType::P2tr;
    }
    if !script.is_empty() && script[0] == 0x6a {
        // OP_RETURN — output is unspendable; payload may carry protocol data
        return ScriptType::OpReturn;
    }
    ScriptType::Unknown
}

// Decode the push operation at `script[i]` (a PUSHBYTES/PUSHDATA1/PUSHDATA2/PUSHDATA4
// opcode), returning its data and the index just past it. `None` if `script[i]` is not
// one of those opcodes, or if the push's length would run past the end of `script`.
pub fn read_push(script: &[u8], i: usize) -> Option<(&[u8], usize)> {
    let op = *script.get(i)?;
    let (start, n) = match op {
        0x01..=0x4b => (i + 1, op as usize),
        0x4c => (i + 2, *script.get(i + 1)? as usize),
        0x4d => {
            if i + 3 > script.len() {
                return None;
            }
            (
                i + 3,
                u16::from_le_bytes([script[i + 1], script[i + 2]]) as usize,
            )
        }
        0x4e => {
            if i + 5 > script.len() {
                return None;
            }
            let n = u32::from_le_bytes([script[i + 1], script[i + 2], script[i + 3], script[i + 4]])
                as usize;
            (i + 5, n)
        }
        _ => return None,
    };
    if start + n > script.len() {
        return None;
    }
    Some((&script[start..start + n], start + n))
}

// Concatenate all push-data payloads following the OP_RETURN opcode.
pub fn extract_op_return_payload(script: &[u8]) -> Vec<u8> {
    if script.is_empty() || script[0] != 0x6a {
        return vec![];
    }
    let mut data = Vec::new();
    let mut i = 1;
    while i < script.len() {
        match script[i] {
            0x01..=0x4e => match read_push(script, i) {
                Some((chunk, next_i)) => {
                    data.extend_from_slice(chunk);
                    i = next_i;
                }
                // Truncated push: nothing more can be recovered from the rest of the script.
                None => break,
            },
            // OP_0 and any opcode without an operand: not a push, skip and keep scanning.
            _ => i += 1,
        }
    }
    data
}

// Identify known OP_RETURN embedded protocols by their magic byte prefix.
pub fn op_return_protocol(data: &[u8]) -> &'static str {
    if data.starts_with(&[0x6f, 0x6d, 0x6e, 0x69]) {
        "omni_layer"
    } else if data.starts_with(&[0x01, 0x09, 0xf9, 0x11, 0x02]) {
        "opentimestamps"
    } else if data.starts_with(&[0x43, 0x4e, 0x54, 0x52, 0x50, 0x52, 0x54, 0x59]) {
        "counterparty"
    } else if data.starts_with(&[0x58, 0x32]) {
        "stacks"
    } else {
        "unknown"
    }
}

// Identify known OP_RETURN protocols from the raw script bytes.
pub fn op_return_protocol_raw(script: &[u8]) -> &'static str {
    if script.is_empty() || script[0] != 0x6a {
        return "unknown";
    }
    if script.len() >= 2 && script[1] == 0x5d {
        return "runes";
    }
    let payload = extract_op_return_payload(script);
    op_return_protocol(&payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classify_script_p2pkh() {
        let mut s = vec![0x76, 0xa9, 0x14];
        s.extend_from_slice(&[0u8; 20]);
        s.extend_from_slice(&[0x88, 0xac]);
        assert_eq!(classify_script(&s), ScriptType::P2pkh);
    }

    #[test]
    fn classify_script_p2sh() {
        let mut s = vec![0xa9, 0x14];
        s.extend_from_slice(&[0u8; 20]);
        s.push(0x87);
        assert_eq!(classify_script(&s), ScriptType::P2sh);
    }

    #[test]
    fn classify_script_p2wpkh() {
        let mut s = vec![0x00, 0x14];
        s.extend_from_slice(&[0u8; 20]);
        assert_eq!(classify_script(&s), ScriptType::P2wpkh);
    }

    #[test]
    fn classify_script_p2wsh() {
        let mut s = vec![0x00, 0x20];
        s.extend_from_slice(&[0u8; 32]);
        assert_eq!(classify_script(&s), ScriptType::P2wsh);
    }

    #[test]
    fn classify_script_p2tr() {
        let mut s = vec![0x51, 0x20];
        s.extend_from_slice(&[0u8; 32]);
        assert_eq!(classify_script(&s), ScriptType::P2tr);
    }

    #[test]
    fn classify_script_op_return() {
        assert_eq!(classify_script(&[0x6a]), ScriptType::OpReturn);
        assert_eq!(classify_script(&[0x6a, 0x00]), ScriptType::OpReturn);
    }

    #[test]
    fn classify_script_unknown() {
        assert_eq!(classify_script(&[]), ScriptType::Unknown);
        assert_eq!(
            classify_script(&[0x51, 0x02, 0xab, 0xcd]),
            ScriptType::Unknown
        );
    }

    #[test]
    fn script_type_as_str_matches_wire_format() {
        assert_eq!(ScriptType::P2pkh.as_str(), "p2pkh");
        assert_eq!(ScriptType::P2sh.as_str(), "p2sh");
        assert_eq!(ScriptType::P2wpkh.as_str(), "p2wpkh");
        assert_eq!(ScriptType::P2wsh.as_str(), "p2wsh");
        assert_eq!(ScriptType::P2tr.as_str(), "p2tr");
        assert_eq!(ScriptType::P2shP2wpkh.as_str(), "p2sh-p2wpkh");
        assert_eq!(ScriptType::P2shP2wsh.as_str(), "p2sh-p2wsh");
        assert_eq!(ScriptType::OpReturn.as_str(), "op_return");
        assert_eq!(ScriptType::Unknown.as_str(), "unknown");
    }

    #[test]
    fn op_return_protocol_known_prefixes() {
        assert_eq!(op_return_protocol(b"omni..."), "omni_layer");
        assert_eq!(
            op_return_protocol(&[0x01, 0x09, 0xf9, 0x11, 0x02, 0xff]),
            "opentimestamps"
        );
        assert_eq!(op_return_protocol(b"CNTRPRTYxyz"), "counterparty");
        assert_eq!(op_return_protocol(&[0x58, 0x32, 0xff]), "stacks");
        assert_eq!(op_return_protocol(b"nothing-recognized"), "unknown");
    }

    #[test]
    fn op_return_protocol_raw_detects_runestone_marker() {
        // OP_RETURN OP_13 <data> — the Runestone protocol marker (script.rs:316).
        let script = [0x6a, 0x5d, 0x02, 0xab, 0xcd];
        assert_eq!(op_return_protocol_raw(&script), "runes");
    }

    #[test]
    fn op_return_protocol_raw_falls_back_to_payload_sniffing() {
        let mut script = vec![0x6a, 0x04];
        script.extend_from_slice(b"omni");
        assert_eq!(op_return_protocol_raw(&script), "omni_layer");
    }

    #[test]
    fn op_return_protocol_raw_non_op_return_is_unknown() {
        assert_eq!(op_return_protocol_raw(&[0x76, 0xa9]), "unknown");
    }

    #[test]
    fn extract_op_return_payload_concatenates_pushes() {
        let script = [0x6a, 0x02, 0xab, 0xcd, 0x02, 0xef, 0x01];
        assert_eq!(
            extract_op_return_payload(&script),
            vec![0xab, 0xcd, 0xef, 0x01]
        );
    }
}
