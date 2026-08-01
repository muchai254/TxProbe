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
