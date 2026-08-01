// Address derivation for all standard Bitcoin output script types.

use crate::crypto::dsha256;
use crate::script::{classify_script, ScriptType};

// Encode a hash payload into a Base58Check address.

pub fn base58check_encode(version: u8, data: &[u8]) -> String {
    let mut payload = vec![version];
    payload.extend_from_slice(data);
    let checksum = dsha256(&payload);
    payload.extend_from_slice(&checksum[..4]);
    bs58::encode(payload).into_string()
}

const BECH32_CHARSET: &[u8] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// Compute the polynomial checksum over a sequence of 5-bit values.

fn bech32_polymod(values: &[u8]) -> u32 {
    let gen: [u32; 5] = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let mut chk: u32 = 1;
    for &v in values {
        let top = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ (v as u32);
        for (i, &g) in gen.iter().enumerate() {
            if (top >> i) & 1 != 0 {
                chk ^= g;
            }
        }
    }
    chk
}

// Expand the human-readable part (HRP, e.g. "bc") into the form required
// by the checksum computation
fn bech32_hrp_expand(hrp: &str) -> Vec<u8> {
    let mut ret = Vec::new();
    for &c in hrp.as_bytes() {
        ret.push(c >> 5);
    }
    ret.push(0);
    for &c in hrp.as_bytes() {
        ret.push(c & 31);
    }
    ret
}

// Produce a 6-character Bech32 or Bech32m checksum for the given HRP and data.
fn bech32_create_checksum(hrp: &str, data: &[u8], is_bech32m: bool) -> [u8; 6] {
    let mut values = bech32_hrp_expand(hrp);
    values.extend_from_slice(data);
    values.extend_from_slice(&[0, 0, 0, 0, 0, 0]);
    let const_val: u32 = if is_bech32m { 0x2bc830a3 } else { 1 };
    let polymod = bech32_polymod(&values) ^ const_val;
    let mut checksum = [0u8; 6];
    for i in 0..6 {
        checksum[i] = ((polymod >> (5 * (5 - i))) & 31) as u8;
    }
    checksum
}

// Repack 8-bit bytes into 5-bit groups for Bech32 encoding.

fn convert_bits_8_to_5(data: &[u8]) -> Vec<u8> {
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    let mut ret = Vec::new();
    for &v in data {
        acc = (acc << 8) | (v as u32);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            ret.push(((acc >> bits) & 31) as u8);
        }
    }
    if bits > 0 {
        ret.push(((acc << (5 - bits)) & 31) as u8);
    }
    ret
}

// Encode a witness program as a Bech32 or Bech32m address.

pub fn bech32_encode_addr(hrp: &str, witness_version: u8, program: &[u8]) -> String {
    let is_bech32m = witness_version > 0;
    let mut data = vec![witness_version];
    data.extend(convert_bits_8_to_5(program));
    let checksum = bech32_create_checksum(hrp, &data, is_bech32m);
    let mut result = format!("{}1", hrp);
    for &d in data.iter().chain(checksum.iter()) {
        result.push(BECH32_CHARSET[d as usize] as char);
    }
    result
}

// Derive a mainnet address from an output script, returning None for
// non-standard or OP_RETURN scripts that have no spendable address.
//
// classify_script has already validated each type's length and byte layout, so the
// payload for a given ScriptType always sits at the same fixed offset — adding a new
// script type only means adding a case here, not re-deriving the layout check.
pub fn address_from_script(script: &[u8]) -> Option<String> {
    match classify_script(script) {
        // P2PKH: 20-byte public key hash at bytes 3-22.
        ScriptType::P2pkh => Some(base58check_encode(0x00, &script[3..23])),
        // P2SH: 20-byte script hash at bytes 2-21.
        ScriptType::P2sh => Some(base58check_encode(0x05, &script[2..22])),
        // P2WPKH/P2WSH: witness program starts at byte 2 (witness version 0).
        ScriptType::P2wpkh | ScriptType::P2wsh => Some(bech32_encode_addr("bc", 0, &script[2..])),
        // P2TR: 32-byte x-only pubkey starts at byte 2 (witness version 1, Bech32m).
        ScriptType::P2tr => Some(bech32_encode_addr("bc", 1, &script[2..])),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Vectors below are cross-checked against an independent Python
    // implementation of Base58Check / Bech32 / Bech32m, not against this
    // module — self-consistency alone wouldn't catch a bug shared by both
    // the encoder and its test.

    #[test]
    fn p2pkh_matches_known_genesis_address() {
        // Hash160 from the genesis coinbase output; address is the famous
        // 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa.
        let hash = hex::decode("62e907b15cbf27d5425399ebf6f0fb50ebb88f18").unwrap();
        let mut script = vec![0x76, 0xa9, 0x14];
        script.extend_from_slice(&hash);
        script.extend_from_slice(&[0x88, 0xac]);
        assert_eq!(
            address_from_script(&script).as_deref(),
            Some("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
        );
    }

    #[test]
    fn p2sh_matches_base58check_vector() {
        let hash = hex::decode("748284390f9e263a4b766a75d0633c50426eb875").unwrap();
        let mut script = vec![0xa9, 0x14];
        script.extend_from_slice(&hash);
        script.push(0x87);
        assert_eq!(
            address_from_script(&script).as_deref(),
            Some("3CK4fEwbMP7heJarmU4eqA3sMbVJyEnU3V")
        );
    }

    #[test]
    fn p2wpkh_matches_bech32_vector() {
        let program = hex::decode("defac73d20f081234b1e0a56b9512d1dfbcfbdf2").unwrap();
        let mut script = vec![0x00, 0x14];
        script.extend_from_slice(&program);
        assert_eq!(
            address_from_script(&script).as_deref(),
            Some("bc1qmmavw0fq7zqjxjc7pfttj5fdrhaul00jljn4f8")
        );
    }

    #[test]
    fn p2wsh_matches_bech32_vector() {
        let program =
            hex::decode("3247259a6a651e47051ec8e0c1f10fd2945653d9dfa2797ebcd0827e5ab306b1")
                .unwrap();
        let mut script = vec![0x00, 0x20];
        script.extend_from_slice(&program);
        assert_eq!(
            address_from_script(&script).as_deref(),
            Some("bc1qxfrjtxn2v50ywpg7ersvrug06229v57em738jl4u6zp8uk4nq6csppqral")
        );
    }

    #[test]
    fn p2tr_matches_bech32m_vector() {
        let xonly =
            hex::decode("b6a9b333ceea3aa65c0229764cc9cedc16c8ea0b4786f9266d1fa37841f8e737")
                .unwrap();
        let mut script = vec![0x51, 0x20];
        script.extend_from_slice(&xonly);
        assert_eq!(
            address_from_script(&script).as_deref(),
            Some("bc1pk65mxv7waga2vhqz99myejwwmstv36stg7r0jfndr73hss0cuumsu8d9lk")
        );
    }

    #[test]
    fn op_return_has_no_address() {
        assert_eq!(address_from_script(&[0x6a, 0x00]), None);
    }
}
