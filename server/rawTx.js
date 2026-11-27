import { createHash } from 'crypto';
import { bcGet } from './blockchair.js';

function u32le(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

function u64le(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function varint(n) {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const b = Buffer.alloc(3);
    b[0] = 0xfd;
    b.writeUInt16LE(n, 1);
    return b;
  }
  const b = Buffer.alloc(5);
  b[0] = 0xfe;
  b.writeUInt32LE(n, 1);
  return b;
}

function withLength(hex) {
  const bytes = Buffer.from(hex || '', 'hex');
  return Buffer.concat([varint(bytes.length), bytes]);
}

function dsha256(buf) {
  return createHash('sha256').update(createHash('sha256').update(buf).digest()).digest();
}

// Blockchair returns each input's witness as comma-separated hex items; an
// empty string means the input has no witness.
function witnessItems(witness) {
  return witness ? witness.split(',') : [];
}

// Serialize a Blockchair transaction dashboard back into raw tx bytes. Returns
// null unless the result hashes to the expected txid and matches its weight.
export function rebuildRawTx(dashTx) {
  const { transaction: t, inputs, outputs } = dashTx;
  if (t.is_coinbase || inputs.length === 0) return null;

  const ins = Buffer.concat(
    inputs.map(i =>
      Buffer.concat([
        Buffer.from(i.transaction_hash, 'hex').reverse(),
        u32le(i.index),
        withLength(i.spending_signature_hex),
        u32le(i.spending_sequence),
      ])
    )
  );
  const outs = Buffer.concat(outputs.map(o => Buffer.concat([u64le(o.value), withLength(o.script_hex)])));
  const body = Buffer.concat([varint(inputs.length), ins, varint(outputs.length), outs]);
  const version = u32le(t.version);
  const locktime = u32le(t.lock_time);

  const stripped = Buffer.concat([version, body, locktime]);
  if (Buffer.from(dsha256(stripped)).reverse().toString('hex') !== t.hash) return null;

  let full = stripped;
  if (t.has_witness) {
    const witness = Buffer.concat(
      inputs.map(i => {
        const items = witnessItems(i.spending_witness);
        return Buffer.concat([varint(items.length), ...items.map(withLength)]);
      })
    );
    full = Buffer.concat([version, Buffer.from([0x00, 0x01]), body, witness, locktime]);
  }

  const weight = stripped.length * 3 + full.length;
  if (weight !== t.weight) return null;
  return full.toString('hex');
}

// Raw tx hex for a dashboard tx: rebuilt locally when possible (free), else
// fetched from the raw endpoint (1 point).
export async function getRawTx(dashTx) {
  const rebuilt = rebuildRawTx(dashTx);
  if (rebuilt) return rebuilt;
  const hash = dashTx.transaction.hash;
  console.log(`[rawTx] rebuild failed for ${hash}, using raw endpoint`);
  const res = await bcGet(`/raw/transaction/${hash}`);
  const raw = res.data?.[hash]?.raw_transaction;
  if (!raw) throw new Error(`Raw transaction ${hash} not found`);
  return raw;
}
