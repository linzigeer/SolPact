const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PublicKey } = require('@solana/web3.js');
const { WalletReadyState } = require('@solana/wallet-adapter-base');
const { getPhantomProvider, SolPactPhantomAdapter } = require('../solana/phantom.ts');

function browserEnvironment(t, properties, userAgent = 'Mozilla/5.0 Chrome/145.0.0.0') {
  const saved = new Map(['window', 'document', 'navigator', 'setInterval'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const timers = [];
  const nativeSetInterval = globalThis.setInterval;
  const window = Object.assign(new EventTarget(), { location: { href: 'http://localhost:3000/', origin: 'http://localhost:3000' } }, properties);
  for (const [key, value] of Object.entries({ window, document: Object.assign(new EventTarget(), { readyState: 'complete' }), navigator: { userAgent } })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  globalThis.setInterval = (...args) => { const timer = nativeSetInterval(...args); timers.push(timer); return timer; };
  t.after(() => {
    timers.forEach(clearInterval);
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return window;
}

function provider({ trusted = false } = {}) {
  const wallet = new EventEmitter();
  wallet.isPhantom = true;
  wallet.isConnected = false;
  wallet.publicKey = null;
  wallet.requests = [];
  wallet.connect = async (options) => {
    wallet.requests.push({ method: 'connect', options });
    if (options?.onlyIfTrusted && !trusted) throw Object.assign(new Error('Not authorized'), { code: 4001 });
    wallet.isConnected = true;
    wallet.publicKey = new PublicKey(new Uint8Array(32).fill(1));
    wallet.emit('connect', wallet.publicKey);
    return { publicKey: wallet.publicKey };
  };
  wallet.disconnect = async () => { wallet.requests.push({ method: 'disconnect' }); wallet.isConnected = false; wallet.publicKey = null; wallet.emit('disconnect'); };
  return wallet;
}

test('a competing wallet claiming Phantom compatibility cannot be selected as Phantom', async (t) => {
  const fuvon = provider();
  fuvon.isFuvon = true;
  browserEnvironment(t, { solana: fuvon, isPhantomInstalled: true });
  const adapter = new SolPactPhantomAdapter();
  assert.equal(getPhantomProvider(), null);
  assert.equal(adapter.readyState, WalletReadyState.NotDetected);
  await assert.rejects(adapter.connect(), { name: 'WalletNotReadyError' });
  assert.deepEqual(fuvon.requests, []);
});

test('Phantom connects and disconnects through its namespace when the generic provider belongs to another wallet', async (t) => {
  const phantom = provider();
  const fuvon = provider();
  browserEnvironment(t, { phantom: { solana: phantom }, solana: fuvon, isPhantomInstalled: true });
  const adapter = new SolPactPhantomAdapter();
  assert.equal(getPhantomProvider(), phantom);
  await adapter.connect();
  assert.equal(adapter.connected, true);
  assert.equal(adapter.publicKey.toBase58(), phantom.publicKey.toBase58());
  await adapter.disconnect();
  assert.equal(adapter.connected, false);
  assert.deepEqual(phantom.requests.map((request) => request.method), ['connect', 'disconnect']);
  assert.deepEqual(fuvon.requests, []);
});

test('a non-Phantom provider in the Phantom namespace is rejected', async (t) => {
  const other = provider();
  other.isPhantom = false;
  browserEnvironment(t, { phantom: { solana: other }, solana: provider(), isPhantomInstalled: true });
  const adapter = new SolPactPhantomAdapter();
  assert.equal(adapter.readyState, WalletReadyState.NotDetected);
  await assert.rejects(adapter.connect(), { name: 'WalletNotReadyError' });
  assert.deepEqual(other.requests, []);
});

test('Phantom works without the optional global installation marker', async (t) => {
  const phantom = provider();
  browserEnvironment(t, { phantom: { solana: phantom } });
  const adapter = new SolPactPhantomAdapter();
  assert.equal(adapter.readyState, WalletReadyState.Installed);
  await adapter.connect();
  assert.equal(adapter.connected, true);
  await adapter.disconnect();
});

test('silent restoration never requests authorization from a competing generic provider', async (t) => {
  const fuvon = provider({ trusted: true });
  browserEnvironment(t, { solana: fuvon, isPhantomInstalled: true });
  await new SolPactPhantomAdapter().autoConnect();
  assert.deepEqual(fuvon.requests, []);
});

test('a revoked Phantom session only receives a silent trusted-session request', async (t) => {
  const phantom = provider();
  browserEnvironment(t, { phantom: { solana: phantom }, isPhantomInstalled: true });
  const adapter = new SolPactPhantomAdapter();
  await adapter.autoConnect();
  assert.equal(adapter.connected, false);
  assert.deepEqual(phantom.requests, [{ method: 'connect', options: { onlyIfTrusted: true } }]);
});

test('a trusted Phantom session restores without a second authorization request', async (t) => {
  const phantom = provider({ trusted: true });
  const fuvon = provider();
  browserEnvironment(t, { phantom: { solana: phantom }, solana: fuvon, isPhantomInstalled: true });
  const adapter = new SolPactPhantomAdapter();
  await adapter.autoConnect();
  assert.equal(adapter.connected, true);
  assert.deepEqual(phantom.requests, [{ method: 'connect', options: { onlyIfTrusted: true } }]);
  assert.deepEqual(fuvon.requests, []);
  await adapter.disconnect();
});

test('iOS without an injected Phantom provider opens the official Phantom browser link', async (t) => {
  const window = browserEnvironment(t, {}, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1');
  const adapter = new SolPactPhantomAdapter();
  assert.equal(adapter.readyState, WalletReadyState.Loadable);
  await adapter.connect();
  assert.ok(window.location.href.startsWith('https://phantom.app/ul/browse/'));
});
