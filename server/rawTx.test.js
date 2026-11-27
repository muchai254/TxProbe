import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rebuildRawTx } from './rawTx.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test-fixtures');

// Each fixture pairs a real Blockchair transaction dashboard with the node's raw hex.
for (const file of fs.readdirSync(dir)) {
  const { raw_tx, dashboard } = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const name = file.replace('.json', '');

  test(`rebuilds ${name}`, () => {
    if (dashboard.transaction.is_coinbase) {
      assert.equal(rebuildRawTx(dashboard), null);
    } else {
      assert.equal(rebuildRawTx(dashboard), raw_tx);
    }
  });
}

test('rejects a dashboard that does not hash to its txid', () => {
  const { dashboard } = JSON.parse(fs.readFileSync(path.join(dir, 'p2pkh_spend.json'), 'utf8'));
  const tampered = structuredClone(dashboard);
  tampered.outputs[0].value += 1;
  assert.equal(rebuildRawTx(tampered), null);
});
