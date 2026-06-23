// Address derivation for all standard Bitcoin output script types.

use crate::crypto::dsha256;

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
pub fn address_from_script(script: &[u8]) -> Option<String> {
    let len = script.len();

    // P2PKH: extract the 20-byte public key hash at bytes 3-22.
    if len == 25
        && script[0] == 0x76
        && script[1] == 0xa9
        && script[2] == 0x14
        && script[23] == 0x88
        && script[24] == 0xac
    {
        return Some(base58check_encode(0x00, &script[3..23]));
    }

    if len == 23 && script[0] == 0xa9 && script[1] == 0x14 && script[22] == 0x87 {
        return Some(base58check_encode(0x05, &script[2..22]));
    }

    if len == 22 && script[0] == 0x00 && script[1] == 0x14 {
        return Some(bech32_encode_addr("bc", 0, &script[2..]));
    }

    if len == 34 && script[0] == 0x00 && script[1] == 0x20 {
        return Some(bech32_encode_addr("bc", 0, &script[2..]));
    }

    if len == 34 && script[0] == 0x51 && script[1] == 0x20 {
        return Some(bech32_encode_addr("bc", 1, &script[2..]));
    }

    None
}
