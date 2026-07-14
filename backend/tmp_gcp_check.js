const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const serviceAccountPath = path.resolve('..', 'serviceAccountKey.json.json');
const envPath = path.resolve('.env.development');
const env = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).reduce((acc, line) => {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim();
  return acc;
}, {});
const key = env.GEMINI_API_KEY;
console.log('ENV_GEMINI_API_KEY=' + key);
if (!key) {
  console.error('NO_GEMINI_API_KEY');
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
console.log('SERVICE_ACCOUNT_PROJECT=' + sa.project_id);
console.log('SERVICE_ACCOUNT_EMAIL=' + sa.client_email);
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method: body ? 'POST' : 'GET',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: options.headers || {},
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, headers: res.headers, text });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
(async () => {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key);
  const jwt = `${unsigned}.${base64url(signature)}`;
  try {
    const tokenResp = await httpRequest('https://oauth2.googleapis.com/token', {}, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`);
    console.log('TOKEN_STATUS=' + tokenResp.status);
    console.log(tokenResp.text);
    if (tokenResp.status !== 200) return;
    const token = JSON.parse(tokenResp.text).access_token;
    const bearer = 'Bearer ' + token;
    const project = sa.project_id;
    const serviceUsageResp = await httpRequest(`https://serviceusage.googleapis.com/v1/projects/${project}/services/generativelanguage.googleapis.com`, { headers: { Authorization: bearer } });
    console.log('SERVICEUSAGE_STATUS=' + serviceUsageResp.status);
    console.log(serviceUsageResp.text);
    const apiKeysResp = await httpRequest(`https://apikeys.googleapis.com/v2/projects/${project}/locations/global/keys`, { headers: { Authorization: bearer } });
    console.log('APIKEYS_LIST_STATUS=' + apiKeysResp.status);
    const keys = JSON.parse(apiKeysResp.text);
    console.log(JSON.stringify(keys, null, 2));
    if (keys.keys) {
      const matching = keys.keys.filter(k => k.keyString === key || (k.restrictions && JSON.stringify(k.restrictions).includes(key)));
      console.log('MATCHING_KEYS_COUNT=' + matching.length);
      matching.forEach((k, idx) => {
        console.log('MATCHING_KEY_' + idx + '=' + JSON.stringify({ name: k.name, displayName: k.displayName, keyString: k.keyString, restrictions: k.restrictions }, null, 2));
      });
    }
    const billingResp = await httpRequest(`https://cloudbilling.googleapis.com/v1/projects/${project}`, { headers: { Authorization: bearer } });
    console.log('BILLING_STATUS=' + billingResp.status);
    console.log(billingResp.text);
    const modelsResp = await httpRequest(`https://generativelanguage.googleapis.com/v1beta2/models?key=${encodeURIComponent(key)}`);
    console.log('GENIE_MODELS_STATUS=' + modelsResp.status);
    console.log(modelsResp.text.slice(0, 2000));
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
  }
})();
