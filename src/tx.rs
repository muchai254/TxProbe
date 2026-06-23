// Transaction parser supporting both legacy and segwit (BIP141) serialization formats.

use crate::crypto::dsha256;
use crate::varint::{compact_size_len, read_compact_size, read_compact_size_vec};
use std::io::{Cursor, Read, Seek, SeekFrom};

pub struct TxInput {
    pub txid_bytes: [u8; 32],
    pub vout: u32,
    pub script_sig: Vec<u8>,
    pub sequence: u32,
    pub witness: Vec<Vec<u8>>,
}

pub struct TxOutput {
    pub value: u64,
    pub script_pubkey: Vec<u8>,
}

// All data extracted from a raw transaction byte slice.
pub struct ParsedTx {
    pub version: i32,
    pub locktime: u32,
    pub is_segwit: bool,
    pub inputs: Vec<TxInput>,
    pub outputs: Vec<TxOutput>,

    pub txid: [u8; 32],

    pub wtxid: [u8; 32],

    pub base_size: usize,
    pub witness_size: usize,

    pub input_values: Vec<u64>,

    pub input_scripts: Vec<Vec<u8>>,
}

// Parse a raw transaction from a byte slice.
pub fn parse_transaction(raw: &[u8]) -> Result<ParsedTx, Box<dyn std::error::Error>> {
    let total_bytes = raw.len();
    let mut r = Cursor::new(raw);

    let mut legacy_bytes: Vec<u8> = Vec::with_capacity(total_bytes);

    let mut ver_buf = [0u8; 4];
    r.read_exact(&mut ver_buf)?;
    legacy_bytes.extend_from_slice(&ver_buf);
    let version = i32::from_le_bytes(ver_buf);

    let mut marker = [0u8; 1];
    r.read_exact(&mut marker)?;
    let is_segwit = marker[0] == 0x00;
    let mut witness_size = 0usize;
    if is_segwit {
        let mut flag = [0u8; 1];
        r.read_exact(&mut flag)?;
        witness_size += 2; // account for marker + flag bytes in witness cost
    } else {
        // Not segwit — the byte we peeked is actually the start of the vin count.
        r.seek(SeekFrom::Current(-1))?;
    }

    let vin_count = read_compact_size_vec(&mut r, &mut legacy_bytes)? as usize;
    let mut inputs: Vec<TxInput> = Vec::with_capacity(vin_count);

    for _ in 0..vin_count {
        let mut txid_buf = [0u8; 32];
        r.read_exact(&mut txid_buf)?;
        legacy_bytes.extend_from_slice(&txid_buf);

        let mut vout_buf = [0u8; 4];
        r.read_exact(&mut vout_buf)?;
        legacy_bytes.extend_from_slice(&vout_buf);
        let vout = u32::from_le_bytes(vout_buf);

        // scriptSig: length-prefixed unlocking script.
        let slen = read_compact_size_vec(&mut r, &mut legacy_bytes)? as usize;
        let mut script_sig = vec![0u8; slen];
        r.read_exact(&mut script_sig)?;
        legacy_bytes.extend_from_slice(&script_sig);

        let mut seq_buf = [0u8; 4];
        r.read_exact(&mut seq_buf)?;
        legacy_bytes.extend_from_slice(&seq_buf);
        let sequence = u32::from_le_bytes(seq_buf);

        inputs.push(TxInput {
            txid_bytes: txid_buf,
            vout,
            script_sig,
            sequence,
            witness: Vec::new(),
        });
    }

    let vout_count = read_compact_size_vec(&mut r, &mut legacy_bytes)? as usize;
    let mut outputs: Vec<TxOutput> = Vec::with_capacity(vout_count);

    for _ in 0..vout_count {
        // 8-byte little-endian satoshi value followed by a length-prefixed scriptPubKey.
        let mut val_buf = [0u8; 8];
        r.read_exact(&mut val_buf)?;
        legacy_bytes.extend_from_slice(&val_buf);
        let value = u64::from_le_bytes(val_buf);

        let slen = read_compact_size_vec(&mut r, &mut legacy_bytes)? as usize;
        let mut script_pubkey = vec![0u8; slen];
        r.read_exact(&mut script_pubkey)?;
        legacy_bytes.extend_from_slice(&script_pubkey);

        outputs.push(TxOutput {
            value,
            script_pubkey,
        });
    }

    // Each stack is a compact-size count followed by that many length-prefixed items.
    if is_segwit {
        for inp in inputs.iter_mut() {
            let item_count = read_compact_size(&mut r)? as usize;
            witness_size += compact_size_len(item_count as u64);
            let mut items: Vec<Vec<u8>> = Vec::with_capacity(item_count);
            for _ in 0..item_count {
                let ilen = read_compact_size(&mut r)? as usize;
                witness_size += compact_size_len(ilen as u64) + ilen;
                let mut item = vec![0u8; ilen];
                r.read_exact(&mut item)?;
                items.push(item);
            }
            inp.witness = items;
        }
    }

    // locktime (4 bytes, little-endian) ---
    let mut lt_buf = [0u8; 4];
    r.read_exact(&mut lt_buf)?;
    legacy_bytes.extend_from_slice(&lt_buf);
    let locktime = u32::from_le_bytes(lt_buf);

    // txid = dSHA256(legacy serialization); wtxid = dSHA256(full raw bytes).
    let txid = dsha256(&legacy_bytes);
    let wtxid = dsha256(raw);
    let base_size = legacy_bytes.len();

    Ok(ParsedTx {
        version,
        locktime,
        is_segwit,
        inputs,
        outputs,
        txid,
        wtxid,
        base_size,
        witness_size,
        input_values: Vec::new(),
        input_scripts: Vec::new(),
    })
}
