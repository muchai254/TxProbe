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

// Map opcode bytes to their human-readable names for script disassembly.

fn opcode_name(op: u8) -> Option<&'static str> {
    match op {
        0x4f => Some("OP_1NEGATE"),
        0x50 => Some("OP_RESERVED"),
        0x61 => Some("OP_NOP"),
        0x62 => Some("OP_VER"),
        0x63 => Some("OP_IF"),
        0x64 => Some("OP_NOTIF"),
        0x65 => Some("OP_VERIF"),
        0x66 => Some("OP_VERNOTIF"),
        0x67 => Some("OP_ELSE"),
        0x68 => Some("OP_ENDIF"),
        0x69 => Some("OP_VERIFY"),
        0x6a => Some("OP_RETURN"),
        0x6b => Some("OP_TOALTSTACK"),
        0x6c => Some("OP_FROMALTSTACK"),
        0x6d => Some("OP_2DROP"),
        0x6e => Some("OP_2DUP"),
        0x6f => Some("OP_3DUP"),
        0x70 => Some("OP_2OVER"),
        0x71 => Some("OP_2ROT"),
        0x72 => Some("OP_2SWAP"),
        0x73 => Some("OP_IFDUP"),
        0x74 => Some("OP_DEPTH"),
        0x75 => Some("OP_DROP"),
        0x76 => Some("OP_DUP"),
        0x77 => Some("OP_NIP"),
        0x78 => Some("OP_OVER"),
        0x79 => Some("OP_PICK"),
        0x7a => Some("OP_ROLL"),
        0x7b => Some("OP_ROT"),
        0x7c => Some("OP_SWAP"),
        0x7d => Some("OP_TUCK"),
        0x7e => Some("OP_CAT"),
        0x7f => Some("OP_SUBSTR"),
        0x80 => Some("OP_LEFT"),
        0x81 => Some("OP_RIGHT"),
        0x82 => Some("OP_SIZE"),
        0x83 => Some("OP_INVERT"),
        0x84 => Some("OP_AND"),
        0x85 => Some("OP_OR"),
        0x86 => Some("OP_XOR"),
        0x87 => Some("OP_EQUAL"),
        0x88 => Some("OP_EQUALVERIFY"),
        0x89 => Some("OP_RESERVED1"),
        0x8a => Some("OP_RESERVED2"),
        0x8b => Some("OP_1ADD"),
        0x8c => Some("OP_1SUB"),
        0x8d => Some("OP_2MUL"),
        0x8e => Some("OP_2DIV"),
        0x8f => Some("OP_NEGATE"),
        0x90 => Some("OP_ABS"),
        0x91 => Some("OP_NOT"),
        0x92 => Some("OP_0NOTEQUAL"),
        0x93 => Some("OP_ADD"),
        0x94 => Some("OP_SUB"),
        0x95 => Some("OP_MUL"),
        0x96 => Some("OP_DIV"),
        0x97 => Some("OP_MOD"),
        0x98 => Some("OP_LSHIFT"),
        0x99 => Some("OP_RSHIFT"),
        0x9a => Some("OP_BOOLAND"),
        0x9b => Some("OP_BOOLOR"),
        0x9c => Some("OP_NUMEQUAL"),
        0x9d => Some("OP_NUMEQUALVERIFY"),
        0x9e => Some("OP_NUMNOTEQUAL"),
        0x9f => Some("OP_LESSTHAN"),
        0xa0 => Some("OP_GREATERTHAN"),
        0xa1 => Some("OP_LESSTHANOREQUAL"),
        0xa2 => Some("OP_GREATERTHANOREQUAL"),
        0xa3 => Some("OP_MIN"),
        0xa4 => Some("OP_MAX"),
        0xa5 => Some("OP_WITHIN"),
        0xa6 => Some("OP_RIPEMD160"),
        0xa7 => Some("OP_SHA1"),
        0xa8 => Some("OP_SHA256"),
        0xa9 => Some("OP_HASH160"),
        0xaa => Some("OP_HASH256"),
        0xab => Some("OP_CODESEPARATOR"),
        0xac => Some("OP_CHECKSIG"),
        0xad => Some("OP_CHECKSIGVERIFY"),
        0xae => Some("OP_CHECKMULTISIG"),
        0xaf => Some("OP_CHECKMULTISIGVERIFY"),
        0xb0 => Some("OP_NOP1"),
        0xb1 => Some("OP_CHECKLOCKTIMEVERIFY"),
        0xb2 => Some("OP_CHECKSEQUENCEVERIFY"),
        0xb3 => Some("OP_NOP4"),
        0xb4 => Some("OP_NOP5"),
        0xb5 => Some("OP_NOP6"),
        0xb6 => Some("OP_NOP7"),
        0xb7 => Some("OP_NOP8"),
        0xb8 => Some("OP_NOP9"),
        0xb9 => Some("OP_NOP10"),
        0xba => Some("OP_CHECKSIGADD"),
        0xff => Some("OP_INVALIDOPCODE"),
        _ => None,
    }
}

// Disassemble a script into space-separated opcode tokens.

pub fn script_asm(script: &[u8]) -> String {
    if script.is_empty() {
        return String::new();
    }
    let mut tokens: Vec<String> = Vec::new();
    let mut i = 0;
    while i < script.len() {
        let op = script[i];
        i += 1;
        match op {
            0x00 => tokens.push("OP_0".to_string()),
            0x01..=0x4b => {
                let n = op as usize;
                if i + n <= script.len() {
                    tokens.push(format!(
                        "OP_PUSHBYTES_{} {}",
                        n,
                        hex::encode(&script[i..i + n])
                    ));
                    i += n;
                } else {
                    tokens.push(format!("OP_PUSHBYTES_{}", n));
                    break;
                }
            }
            0x4c => {
                if i < script.len() {
                    let n = script[i] as usize;
                    i += 1;
                    if i + n <= script.len() {
                        tokens.push(format!("OP_PUSHDATA1 {}", hex::encode(&script[i..i + n])));
                        i += n;
                    } else {
                        tokens.push("OP_PUSHDATA1".to_string());
                    }
                }
            }
            0x4d => {
                if i + 2 <= script.len() {
                    let n = u16::from_le_bytes([script[i], script[i + 1]]) as usize;
                    i += 2;
                    if i + n <= script.len() {
                        tokens.push(format!("OP_PUSHDATA2 {}", hex::encode(&script[i..i + n])));
                        i += n;
                    } else {
                        tokens.push("OP_PUSHDATA2".to_string());
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
                        tokens.push(format!("OP_PUSHDATA4 {}", hex::encode(&script[i..i + n])));
                        i += n;
                    } else {
                        tokens.push("OP_PUSHDATA4".to_string());
                    }
                }
            }
            0x4f => tokens.push("OP_1NEGATE".to_string()),
            0x51..=0x60 => {
                let n = op - 0x50;
                tokens.push(format!("OP_{}", n));
            }
            other => {
                if let Some(name) = opcode_name(other) {
                    tokens.push(name.to_string());
                } else {
                    tokens.push(format!("OP_UNKNOWN_0x{:02X}", other));
                }
            }
        }
    }
    tokens.join(" ")
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

// Return the last push-data item from a scriptSig.

pub fn extract_last_push(script: &[u8]) -> Option<Vec<u8>> {
    let mut i = 0;
    let mut last: Option<Vec<u8>> = None;
    while i < script.len() {
        let op = script[i];
        i += 1;
        let data = match op {
            0x00 => {
                last = Some(vec![]);
                continue;
            }
            0x01..=0x4b => {
                let n = op as usize;
                if i + n > script.len() {
                    return last;
                }
                let d = script[i..i + n].to_vec();
                i += n;
                d
            }
            0x4c => {
                if i >= script.len() {
                    return last;
                }
                let n = script[i] as usize;
                i += 1;
                if i + n > script.len() {
                    return last;
                }
                let d = script[i..i + n].to_vec();
                i += n;
                d
            }
            0x4d => {
                if i + 2 > script.len() {
                    return last;
                }
                let n = u16::from_le_bytes([script[i], script[i + 1]]) as usize;
                i += 2;
                if i + n > script.len() {
                    return last;
                }
                let d = script[i..i + n].to_vec();
                i += n;
                d
            }
            0x4e => {
                if i + 4 > script.len() {
                    return last;
                }
                let n = u32::from_le_bytes([script[i], script[i + 1], script[i + 2], script[i + 3]])
                    as usize;
                i += 4;
                if i + n > script.len() {
                    return last;
                }
                let d = script[i..i + n].to_vec();
                i += n;
                d
            }
            _ => continue,
        };
        last = Some(data);
    }
    last
}

// Classify how an input spends its prevout, using the prevout script plus the
// scriptSig and witness data from the spending input.

pub fn classify_input_type(
    prevout_script: &[u8],
    script_sig: &[u8],
    witness: &[Vec<u8>],
) -> &'static str {
    match classify_script(prevout_script) {
        "p2pkh" => "p2pkh",
        "p2wpkh" => "p2wpkh",
        "p2wsh" => "p2wsh",
        "p2tr" => {
            let mut items = witness.len();
            if items > 0 && !witness[items - 1].is_empty() && witness[items - 1][0] == 0x50 {
                items -= 1;
            }
            if items >= 2 {
                "p2tr_scriptpath"
            } else {
                "p2tr_keypath"
            }
        }
        "p2sh" => match extract_last_push(script_sig) {
            Some(redeem) => match classify_script(&redeem) {
                "p2wpkh" => "p2sh-p2wpkh",
                "p2wsh" => "p2sh-p2wsh",
                _ => "unknown",
            },
            None => "unknown",
        },
        _ => "unknown",
    }
}
