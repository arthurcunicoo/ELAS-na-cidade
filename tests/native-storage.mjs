import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, webcrypto } from 'node:crypto';
import ts from 'typescript';
import { createClient, processLock } from '@supabase/supabase-js';
import { createProtectedStore } from '../lib/storage/protectedStore.ts';

const require = createRequire(import.meta.url);
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => mocks[name] ?? require(name), module, module.exports);
  return module.exports;
}

// SDK 55 only accepted ByteArray here; SDK 58 also accepts base64 strings.
// Bytes remain supported by both, preserving existing encrypted v1 sessions.
// Exercise the installed Expo JS wrapper with that shared native input shape.
const android = fs.readFileSync(new URL('../node_modules/expo-crypto/android/src/main/java/expo/modules/crypto/aes/AesCryptoModule.kt', import.meta.url), 'utf8');
assert.match(android, /StaticFunction\("fromCombined"\)\s*\{\s*combined:\s*(?:ByteArray|BinaryInput)/);
let combinedCalls = 0;
class NativeKey {
  constructor(bytes) { this.bytes = bytes; }
  static async generate() { return new NativeKey(webcrypto.getRandomValues(new Uint8Array(32))); }
  static async import(value, encoding) {
    assert.equal(encoding, 'base64');
    return new NativeKey(new Uint8Array(Buffer.from(value, 'base64')));
  }
  async encoded(format) { assert.equal(format, 'base64'); return Buffer.from(this.bytes).toString('base64'); }
}
class NativeSealedData {
  constructor(bytes) { this.bytes = bytes; }
  static fromCombined(value) {
    combinedCalls++;
    assert.ok(value instanceof Uint8Array, '[fromCombined] Android requires Uint8Array, not base64 text');
    assert.ok(value.length >= 28, 'IV + authentication tag must exist');
    return new NativeSealedData(value);
  }
  async combined(format) { assert.equal(format, 'base64'); return Buffer.from(this.bytes).toString('base64'); }
}
const nativeCrypto = {
  EncryptionKey: NativeKey, SealedData: NativeSealedData,
  async encryptAsync(plaintext, key, options) {
    assert.ok(plaintext instanceof Uint8Array);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const imported = await webcrypto.subtle.importKey('raw', key.bytes, 'AES-GCM', false, ['encrypt']);
    const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from(options.additionalData, 'base64') }, imported, plaintext);
    return new NativeSealedData(new Uint8Array(Buffer.concat([iv, Buffer.from(encrypted)])));
  },
  async decryptAsync(sealed, key, options) {
    const imported = await webcrypto.subtle.importKey('raw', key.bytes, 'AES-GCM', false, ['decrypt']);
    return new Uint8Array(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.bytes.slice(0, 12), additionalData: Buffer.from(options.additionalData, 'base64') }, imported, sealed.bytes.slice(12)));
  },
};
const expoAES = load('../node_modules/expo-crypto/src/aes/index.ts', {
  './ExpoCryptoAES': { default: nativeCrypto }, './aes.types': {},
  './web-utils': { uint8ArrayToBase64: value => Buffer.from(value).toString('base64') },
});
const rows = new Map(), secrets = new Map();
const raw = {
  getItem: async key => rows.get(key) ?? null,
  setItem: async (key, value) => { rows.set(key, value); },
  removeItem: async key => { rows.delete(key); },
  getAllKeys: async () => [...rows.keys()],
};
const secure = {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: async key => secrets.get(key) ?? null,
  setItemAsync: async (key, value) => { secrets.set(key, value); },
  deleteItemAsync: async key => { secrets.delete(key); },
};
function adapter() {
  return load('../lib/storage/protectedStorage.ts', {
    '@react-native-async-storage/async-storage': { default: raw },
    'expo-secure-store': secure,
    'expo-crypto': { ...expoAES, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_algorithm, value) => createHash('sha256').update(value).digest('hex') },
    './protectedStore': { createProtectedStore },
  }).protectedStorage;
}
const first = adapter();
const session = JSON.stringify({ access_token: 'test-token'.repeat(5000), user: { id: 'fixture', name: 'João — avaliação 🏙️' } });
await first.setItem('sb-fixture-auth-token', session);
const persisted = rows.get('sb-fixture-auth-token');
assert.ok(persisted.startsWith('elas.enc.v1:'));
assert.ok(!persisted.includes('test-token'));
assert.equal(await adapter().getItem('sb-fixture-auth-token'), session, 'a cold native session read must work');
assert.equal(rows.get('sb-fixture-auth-token'), persisted, 'existing v1 ciphertext stays intact');
assert.equal(secrets.size, 1, 'the existing secure key is reused');
assert.ok(combinedCalls > 0);

rows.set('legacy-draft', 'Percepção da praça: tranquila 🌳');
assert.equal(await first.getItem('legacy-draft'), 'Percepção da praça: tranquila 🌳');
assert.ok(rows.get('legacy-draft').startsWith('elas.enc.v1:'));
assert.equal(await adapter().getItem('legacy-draft'), 'Percepção da praça: tranquila 🌳');

const slot = key => 'elas.key.' + createHash('sha256').update(key).digest('hex');
rows.set('other-account', persisted);
secrets.set(slot('other-account'), secrets.get(slot('sb-fixture-auth-token')));
await assert.rejects(first.getItem('other-account'), 'AAD prevents moving encrypted sessions between scopes');
assert.equal(rows.get('other-account'), persisted);
rows.set('corrupt', 'elas.enc.v1:not-base64!');
secrets.set(slot('corrupt'), secrets.get(slot('sb-fixture-auth-token')));
await assert.rejects(first.getItem('corrupt'));
assert.equal(rows.get('corrupt'), 'elas.enc.v1:not-base64!');

const tampered = Buffer.from(persisted.slice('elas.enc.v1:'.length), 'base64');
tampered[tampered.length - 1] ^= 1;
rows.set('sb-fixture-auth-token', 'elas.enc.v1:' + tampered.toString('base64'));
await assert.rejects(first.getItem('sb-fixture-auth-token'), 'GCM rejects tampered data');
rows.set('sb-fixture-auth-token', persisted);
secrets.delete(slot('sb-fixture-auth-token'));
await assert.rejects(first.getItem('sb-fixture-auth-token'));
await assert.rejects(first.setItem('sb-fixture-auth-token', 'do not overwrite'));
assert.equal(rows.get('sb-fixture-auth-token'), persisted, 'key loss must not silently erase sessions');
await first.removeItem('sb-fixture-auth-token');
assert.equal(await first.getItem('sb-fixture-auth-token'), null);

// Reproduce the user's sequence through the real Supabase client: sign in,
// persist, reopen the app, then call the version RPC with the restored token.
// The transport is isolated; fixture credentials never reach the live project.
const expires = Math.floor(Date.now() / 1000) + 3600;
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: '11111111-1111-4111-8111-111111111111', exp: expires, aud: 'authenticated', role: 'authenticated' }) + '.fixture';
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', email: 'native-test@example.invalid', user_metadata: {}, app_metadata: {} };
let rpcCalls = 0;
const transport = async (url, options) => {
  assert.ok(String(url).startsWith('https://native-fixture.invalid/'));
  const endpoint = new URL(url).pathname;
  if (endpoint === '/auth/v1/token') return Response.json({ access_token: token, refresh_token: 'fixture-only', token_type: 'bearer', expires_in: 3600, expires_at: expires, user });
  if (endpoint === '/rest/v1/rpc/versao_app') {
    rpcCalls++;
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer ' + token);
    return Response.json(11);
  }
  throw Error('Unexpected fixture request ' + endpoint);
};
const client = () => createClient('https://native-fixture.invalid', 'fixture-publishable', { global: { fetch: transport }, auth: { storageKey: 'native-contract-session', storage: adapter(), lock: processLock, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false } });
const beforeRestart = client();
const login = await beforeRestart.auth.signInWithPassword({ email: user.email, password: 'fixture-password' });
assert.equal(login.error, null);
assert.ok(rows.get('native-contract-session').startsWith('elas.enc.v1:'));
const afterRestart = client();
const restored = await afterRestart.auth.getSession();
assert.equal(restored.error, null);
assert.equal(restored.data.session.user.id, user.id);
const version = await afterRestart.rpc('versao_app');
assert.equal(version.error, null);
assert.equal(version.data, 11);
assert.equal(rpcCalls, 1);
await Promise.all([beforeRestart.auth.stopAutoRefresh(), afterRestart.auth.stopAutoRefresh()]);
console.log('Native storage passed: real Expo AES wrapper and Supabase login → encrypted persistence → restart → authenticated version RPC; Android ByteArray contract, large Unicode payload, v1 reuse, legacy migration, AAD, tampering and key loss. Native keystore/device execution is a separate check.');
