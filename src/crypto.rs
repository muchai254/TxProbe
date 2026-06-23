// Low-level cryptographic utilities used throughout the parsing pipeline.

use sha2::{Digest, Sha256};

pub fn dsha256(data: &[u8]) -> [u8; 32] {
    let h1 = Sha256::digest(data);
    let h2 = Sha256::digest(h1);
    let mut out = [0u8; 32];
    out.copy_from_slice(&h2);
    out
}

// Reverses a byte slice and returns it as a lowercase hex string.

pub fn hex_rev(bytes: &[u8]) -> String {
    let mut v = bytes.to_vec();
    v.reverse();
    hex::encode(v)
}

// Decrypts `data` in-place using a cyclically repeating `key`.

pub fn apply_xor(data: &mut [u8], key: &[u8]) {
    if key.is_empty() || key.iter().all(|&b| b == 0) {
        return;
    }
    for i in 0..data.len() {
        data[i] ^= key[i % key.len()];
    }
}
