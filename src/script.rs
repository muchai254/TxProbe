// Script classification, disassembly, and OP_RETURN parsing.

pub fn classify_script(script: &[u8]) -> &'static str {
    let len = script.len();
    if len == 25
        && script[0] == 0x76  // OP_DUP
        && script[1] == 0xa9  // OP_HASH160
        && script[2] == 0x14  // push 20 bytes
        && script[23] == 0x88 // OP_EQUALVERIFY
        && script[24] == 0xac
    // OP_CHECKSIG
    {
        return "p2pkh";
    }
    if len == 23
        && script[0] == 0xa9  // OP_HASH160
        && script[1] == 0x14  // push 20 bytes
        && script[22] == 0x87
    // OP_EQUAL
    {
        return "p2sh";
    }
    if len == 22 && script[0] == 0x00 && script[1] == 0x14 {
        // OP_0 + 20-byte push
        return "p2wpkh";
    }
    if len == 34 && script[0] == 0x00 && script[1] == 0x20 {
        // OP_0 + 32-byte push
        return "p2wsh";
    }
    if len == 34 && script[0] == 0x51 && script[1] == 0x20 {
        // OP_1 + 32-byte push (Taproot, BIP340/341)
        return "p2tr";
    }
    if !script.is_empty() && script[0] == 0x6a {
        // OP_RETURN — output is unspendable; payload may carry protocol data
        return "op_return";
    }
    "unknown"
}

// Concatenate all push-data payloads following the OP_RETURN opcode.
pub fn extract_op_return_payload(script: &[u8]) -> Vec<u8> {
    if script.is_empty() || script[0] != 0x6a {
        return vec![];
    }
    let mut data = Vec::new();
    let mut i = 1;
    while i < script.len() {
        let op = script[i];
        i += 1;
        match op {
            0x00 => {}
            0x01..=0x4b => {
                let n = op as usize;
                if i + n <= script.len() {
                    data.extend_from_slice(&script[i..i + n]);
                    i += n;
                } else {
                    break;
                }
            }
            0x4c => {
                if i < script.len() {
                    let n = script[i] as usize;
                    i += 1;
                    if i + n <= script.len() {
                        data.extend_from_slice(&script[i..i + n]);
                        i += n;
                    } else {
                        break;
                    }
                }
            }
            0x4d => {
                if i + 2 <= script.len() {
                    let n = u16::from_le_bytes([script[i], script[i + 1]]) as usize;
                    i += 2;
                    if i + n <= script.len() {
                        data.extend_from_slice(&script[i..i + n]);
                        i += n;
                    } else {
                        break;
                    }
                }
            }
            0x4e => {
                if i + 4 <= script.len() {
                    let n = u32::from_le_bytes([
                        script[i],
                        script[i + 1],
                        script[i + 2],
                        script[i + 3],
                    ]) as usize;
                    i += 4;
                    if i + n <= script.len() {
                        data.extend_from_slice(&script[i..i + n]);
                        i += n;
                    } else {
                        break;
                    }
                }
            }
            _ => {}
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
        assert_eq!(classify_script(&s), "p2pkh");
    }

    #[test]
    fn classify_script_p2sh() {
        let mut s = vec![0xa9, 0x14];
        s.extend_from_slice(&[0u8; 20]);
        s.push(0x87);
        assert_eq!(classify_script(&s), "p2sh");
    }

    #[test]
    fn classify_script_p2wpkh() {
        let mut s = vec![0x00, 0x14];
        s.extend_from_slice(&[0u8; 20]);
        assert_eq!(classify_script(&s), "p2wpkh");
    }

    #[test]
    fn classify_script_p2wsh() {
        let mut s = vec![0x00, 0x20];
        s.extend_from_slice(&[0u8; 32]);
        assert_eq!(classify_script(&s), "p2wsh");
    }

    #[test]
    fn classify_script_p2tr() {
        let mut s = vec![0x51, 0x20];
        s.extend_from_slice(&[0u8; 32]);
        assert_eq!(classify_script(&s), "p2tr");
    }

    #[test]
    fn classify_script_op_return() {
        assert_eq!(classify_script(&[0x6a]), "op_return");
        assert_eq!(classify_script(&[0x6a, 0x00]), "op_return");
    }

    #[test]
    fn classify_script_unknown() {
        assert_eq!(classify_script(&[]), "unknown");
        assert_eq!(classify_script(&[0x51, 0x02, 0xab, 0xcd]), "unknown");
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
