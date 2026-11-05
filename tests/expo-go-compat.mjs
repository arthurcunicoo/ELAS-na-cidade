import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const expoVersion = require('expo/package.json').version;
assert.equal(expoVersion.split('.')[0], '58', 'the installed SDK must match Expo Go 58');
const results = [];
for (const platform of ['android', 'ios']) {
  const response = await fetch(process.env.QA_WELCOME_URL ?? 'http://localhost:8086', {
    headers: { accept: 'application/expo+json', 'expo-platform': platform, 'expo-protocol-version': '1' },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, `Expo Go ${platform} manifest must load`);
  const manifest = await response.json();
  const config = manifest.extra?.expoClient;
  assert.equal(config?.sdkVersion, '58.0.0', `${platform} must advertise SDK 58, not SDK 55`);
  assert.equal(manifest.runtimeVersion, 'exposdk:58.0.0');
  assert.ok(manifest.launchAsset?.url, 'the manifest includes a native launch bundle');
  const bundle = new URL(manifest.launchAsset.url);
  assert.equal(bundle.searchParams.get('platform'), platform);
  const launch = await fetch(bundle, { signal: AbortSignal.timeout(120000) });
  assert.equal(launch.status, 200, `${platform} native launch bundle must compile and load`);
  const bundleBytes = (await launch.arrayBuffer()).byteLength;
  assert.ok(bundleBytes > 100000, 'the native bundle must contain the compiled app');
  results.push({ platform, sdkVersion: config.sdkVersion, runtimeVersion: manifest.runtimeVersion, launchBundle: true, bundleBytes });
}
const result = { expoVersion, results, physicalDeviceTested: false };
console.log(JSON.stringify(result));
if (process.env.QA_SDK_OUTPUT) await writeFile(process.env.QA_SDK_OUTPUT, JSON.stringify(result, null, 2) + '\n');
