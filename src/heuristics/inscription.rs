// Witness-based inscription (Ordinals / BRC-20) detection

use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::not_detected;

fn decode_push(script: &[u8], pos: usize) -> Option<(usize, usize)> {
    let op = *script.get(pos)?;
    match op {
        0x01..=0x4b => Some((pos + 1, op as usize)),
        0x4c => {
            let len = *script.get(pos + 1)? as usize;
            Some((pos + 2, len))
        }
        0x4d => {
            if pos + 2 >= script.len() {
                return None;
            }
            let len = u16::from_le_bytes([script[pos + 1], script[pos + 2]]) as usize;
            Some((pos + 3, len))
        }
        _ => None,
    }
}

fn extract_inscription_content_type(script: &[u8], after_tag: usize) -> Option<String> {
    let field_byte = *script.get(after_tag)?;
    if field_byte != 0x51 && field_byte != 0x01 {
        return None;
    }
    let (ct_start, ct_len) = decode_push(script, after_tag + 1)?;
    if ct_start + ct_len > script.len() {
        return None;
    }
    String::from_utf8(script[ct_start..ct_start + ct_len].to_vec()).ok()
}

pub fn detect(ctx: &TxContext) -> Value {
    const ORD_MARKER: &[u8] = &[0x63, 0x03, 0x6f, 0x72, 0x64];
    const BRC20_TAG: &[u8] = b"brc-20";

    for input in &ctx.tx.inputs {
        for item in &input.witness {
            if item.len() < 5 {
                continue;
            }
            let Some(env_pos) = item.windows(5).position(|w| w == ORD_MARKER) else {
                continue;
            };

            let after_tag = env_pos + 5;
            let content_type =
                extract_inscription_content_type(item, after_tag).unwrap_or_default();

            let protocol = if item[after_tag..].windows(6).any(|w| w == BRC20_TAG) {
                "brc20"
            } else {
                "ordinals"
            };

            return json!({
                "detected": true,
                "protocol": protocol,
                "content_type": content_type,
            });
        }
    }

    not_detected()
}
