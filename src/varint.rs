// Variable-length integer readers used throughout the Bitcoin binary format.

use sha2::digest::Update;
use sha2::Sha256;
use std::io::{self, Read};

pub fn read_compact_size<R: Read>(r: &mut R) -> io::Result<u64> {
    let mut b = [0u8; 1];
    r.read_exact(&mut b)?;
    match b[0] {
        0xfd => {
            let mut buf = [0u8; 2];
            r.read_exact(&mut buf)?;
            Ok(u16::from_le_bytes(buf) as u64)
        }
        0xfe => {
            let mut buf = [0u8; 4];
            r.read_exact(&mut buf)?;
            Ok(u32::from_le_bytes(buf) as u64)
        }
        0xff => {
            let mut buf = [0u8; 8];
            r.read_exact(&mut buf)?;
            Ok(u64::from_le_bytes(buf))
        }
        x => Ok(x as u64),
    }
}

pub fn read_csz_hash<R: Read>(r: &mut R, h: &mut Sha256) -> io::Result<u64> {
    let mut b = [0u8; 1];
    r.read_exact(&mut b)?;
    h.update(&b);
    match b[0] {
        0xfd => {
            let mut buf = [0u8; 2];
            r.read_exact(&mut buf)?;
            h.update(&buf);
            Ok(u16::from_le_bytes(buf) as u64)
        }
        0xfe => {
            let mut buf = [0u8; 4];
            r.read_exact(&mut buf)?;
            h.update(&buf);
            Ok(u32::from_le_bytes(buf) as u64)
        }
        0xff => {
            let mut buf = [0u8; 8];
            r.read_exact(&mut buf)?;
            h.update(&buf);
            Ok(u64::from_le_bytes(buf))
        }
        x => Ok(x as u64),
    }
}

// Returns the byte width a CompactSize encoding of `n` would occupy.

pub fn compact_size_len(n: u64) -> usize {
    if n < 0xfd {
        1
    } else if n <= 0xffff {
        3
    } else if n <= 0xffffffff {
        5
    } else {
        9
    }
}

// LEB128-like VarInt used in Bitcoin's undo (rev) files.

pub fn read_varint_base128<R: Read>(r: &mut R) -> io::Result<u64> {
    let mut n: u64 = 0;
    loop {
        let mut b = [0u8; 1];
        r.read_exact(&mut b)?;
        let ch = b[0];
        n = (n << 7) | (u64::from(ch & 0x7f));
        if (ch & 0x80) != 0 {
            // High bit set: more bytes follow; add 1 to prevent redundant encodings.
            n += 1;
        } else {
            return Ok(n);
        }
    }
}

// Reverses transformation to recover the original satoshi value.
pub fn decompress_amount(mut x: u64) -> u64 {
    if x == 0 {
        return 0;
    }
    x -= 1;
    let e = (x % 10) as u32; // number of trailing decimal zeros
    x /= 10;
    let n = if e < 9 {
        let d = (x % 9) + 1; // leading significant digit (1-9)
        x /= 9;
        x * 10 + d
    } else {
        x + 1
    };
    n * 10u64.pow(e)
}

// Reads exactly `n` bytes from `r` and feeds them into the SHA256 hasher.

pub fn read_hash<R: Read>(r: &mut R, h: &mut Sha256, n: usize) -> io::Result<()> {
    let mut buf = [0u8; 4096];
    let mut rem = n;
    while rem > 0 {
        let chunk = rem.min(buf.len());
        r.read_exact(&mut buf[..chunk])?;
        h.update(&buf[..chunk]);
        rem -= chunk;
    }
    Ok(())
}

// Reads and discards exactly `n` bytes.
pub fn read_skip<R: Read>(r: &mut R, n: usize) -> io::Result<()> {
    let mut buf = [0u8; 4096];
    let mut rem = n;
    while rem > 0 {
        let chunk = rem.min(buf.len());
        r.read_exact(&mut buf[..chunk])?;
        rem -= chunk;
    }
    Ok(())
}

// Reads exactly `n` bytes, feeds them into the hasher, and returns them.

pub fn read_hash_vec<R: Read>(r: &mut R, h: &mut Sha256, n: usize) -> io::Result<Vec<u8>> {
    let mut v = vec![0u8; n];
    r.read_exact(&mut v)?;
    h.update(&v);
    Ok(v)
}

pub fn read_compact_size_vec<R: Read>(r: &mut R, out: &mut Vec<u8>) -> io::Result<u64> {
    let mut b = [0u8; 1];
    r.read_exact(&mut b)?;
    out.push(b[0]);
    match b[0] {
        0xfd => {
            let mut buf = [0u8; 2];
            r.read_exact(&mut buf)?;
            out.extend_from_slice(&buf);
            Ok(u16::from_le_bytes(buf) as u64)
        }
        0xfe => {
            let mut buf = [0u8; 4];
            r.read_exact(&mut buf)?;
            out.extend_from_slice(&buf);
            Ok(u32::from_le_bytes(buf) as u64)
        }
        0xff => {
            let mut buf = [0u8; 8];
            r.read_exact(&mut buf)?;
            out.extend_from_slice(&buf);
            Ok(u64::from_le_bytes(buf))
        }
        x => Ok(x as u64),
    }
}
