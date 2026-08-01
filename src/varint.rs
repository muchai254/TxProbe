// Variable-length integer readers used throughout the Bitcoin binary format.

use std::io::{self, Read};

fn read_compact_size_impl<R: Read>(r: &mut R, mut out: Option<&mut Vec<u8>>) -> io::Result<u64> {
    let mut b = [0u8; 1];
    r.read_exact(&mut b)?;
    if let Some(o) = out.as_mut() {
        o.push(b[0]);
    }
    match b[0] {
        0xfd => {
            let mut buf = [0u8; 2];
            r.read_exact(&mut buf)?;
            if let Some(o) = out.as_mut() {
                o.extend_from_slice(&buf);
            }
            Ok(u16::from_le_bytes(buf) as u64)
        }
        0xfe => {
            let mut buf = [0u8; 4];
            r.read_exact(&mut buf)?;
            if let Some(o) = out.as_mut() {
                o.extend_from_slice(&buf);
            }
            Ok(u32::from_le_bytes(buf) as u64)
        }
        0xff => {
            let mut buf = [0u8; 8];
            r.read_exact(&mut buf)?;
            if let Some(o) = out.as_mut() {
                o.extend_from_slice(&buf);
            }
            Ok(u64::from_le_bytes(buf))
        }
        x => Ok(x as u64),
    }
}

pub fn read_compact_size<R: Read>(r: &mut R) -> io::Result<u64> {
    read_compact_size_impl(r, None)
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

// Same encoding as read_compact_size, but also mirrors the consumed bytes into `out` —
// tx.rs uses this to rebuild the legacy serialization needed for txid computation.
pub fn read_compact_size_vec<R: Read>(r: &mut R, out: &mut Vec<u8>) -> io::Result<u64> {
    read_compact_size_impl(r, Some(out))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn read_compact_size_single_byte() {
        // Values below 0xfd are encoded as a single byte with no prefix.
        let mut c = Cursor::new(vec![0x00]);
        assert_eq!(read_compact_size(&mut c).unwrap(), 0);

        let mut c = Cursor::new(vec![0xfc]);
        assert_eq!(read_compact_size(&mut c).unwrap(), 0xfc);
    }

    #[test]
    fn read_compact_size_u16_prefix() {
        // 0xfd prefix + 2-byte little-endian value.
        let mut c = Cursor::new(vec![0xfd, 0x00, 0x01]);
        assert_eq!(read_compact_size(&mut c).unwrap(), 0x0100);
    }

    #[test]
    fn read_compact_size_u32_prefix() {
        // 0xfe prefix + 4-byte little-endian value.
        let mut c = Cursor::new(vec![0xfe, 0x00, 0x00, 0x01, 0x00]);
        assert_eq!(read_compact_size(&mut c).unwrap(), 0x0001_0000);
    }

    #[test]
    fn read_compact_size_u64_prefix() {
        // 0xff prefix + 8-byte little-endian value.
        let mut c = Cursor::new(vec![0xff, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
        assert_eq!(read_compact_size(&mut c).unwrap(), 0x0000_0001_0000_0000);
    }

    #[test]
    fn compact_size_len_matches_encoding_width() {
        assert_eq!(compact_size_len(0), 1);
        assert_eq!(compact_size_len(0xfc), 1);
        assert_eq!(compact_size_len(0xfd), 3);
        assert_eq!(compact_size_len(0xffff), 3);
        assert_eq!(compact_size_len(0x1_0000), 5);
        assert_eq!(compact_size_len(0xffff_ffff), 5);
        assert_eq!(compact_size_len(0x1_0000_0000), 9);
    }

    #[test]
    fn read_compact_size_vec_mirrors_consumed_bytes() {
        let mut out = Vec::new();
        let mut c = Cursor::new(vec![0xfd, 0x34, 0x12]);
        let v = read_compact_size_vec(&mut c, &mut out).unwrap();
        assert_eq!(v, 0x1234);
        assert_eq!(out, vec![0xfd, 0x34, 0x12]);
    }
}
