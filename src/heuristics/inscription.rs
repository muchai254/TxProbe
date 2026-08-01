// Witness-based inscription (Ordinals / BRC-20) detection

use crate::script::read_push;
use serde_json::{json, Value};

use super::analysis::TxContext;
use super::common::not_detected;

fn extract_inscription_content_type(script: &[u8], after_tag: usize) -> Option<String> {
    let field_byte = *script.get(after_tag)?;
    if field_byte != 0x51 && field_byte != 0x01 {
        return None;
    }
    let (content_type, _) = read_push(script, after_tag + 1)?;
    String::from_utf8(content_type.to_vec()).ok()
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
