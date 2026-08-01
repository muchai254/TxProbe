import https from 'https';

// The frontend's fetchAddressTxs (web/src/lib/api.ts) talks to this same API
// directly, bypassing the server — its base URL is duplicated there.
export const BLOCKSTREAM_API = 'https://blockstream.info/api';

// Use https module directly with family:4 to avoid IPv6 ETIMEDOUT in this environment.
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      { hostname: u.hostname, path: u.pathname + u.search, family: 4, timeout: 15000 },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          } else {
            resolve(body);
          }
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timeout: ${url}`)); });
    req.on('error', reject);
  });
}

export async function fetchJson(url) {
  const body = await httpsGet(url);
  return JSON.parse(body);
}

export async function fetchText(url) {
  return httpsGet(url);
}
