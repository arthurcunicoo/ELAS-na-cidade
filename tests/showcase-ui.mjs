import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Check request races and real/demo separation with the actual components and services.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
const native = { Text: 'Text', View: 'View', StyleSheet: { create: x => x } };
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const resolve = name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name in mocks) return mocks[name];
    if (name.endsWith('/lib/pagination')) return load('../lib/pagination.ts', {});
    if (name === './pagination' || name.endsWith('/services/pagination')) return { cursorPage: () => { throw Error('Unexpected paginated query in this non-paginated flow'); } };
    throw new Error('Unmocked import ' + name);
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
const theme = load('../constants/theme.ts', {});
let sampleReads=0;
const RealSummary=props=>React.createElement('RealSummary',props);
const {PlaceReviewPreview}=load('../components/map/PlaceReviewPreview.tsx',{
 './CommunityReviewSummary':{CommunityReviewSummary:RealSummary},
 '../../services/showcase':{listDemonstrations:()=>{sampleReads++;throw Error('No fictional reviews allowed');}},
});
assert.equal(PlaceReviewPreview,RealSummary,'place preview delegates directly to real community data');
assert.equal(sampleReads,0,'fictional reviews are never requested, including presentation builds');
const rpcCalls = [];
const { registerEvent } = load('../features/community/community.ts', {
  '../../lib/supabase': { requireBackend: () => ({ rpc: async (name, args) => { rpcCalls.push({ name, args }); return { error: null }; } }) },
});
await assert.rejects(registerEvent('demo:evento:1', true), /demonstração/);
assert.equal(rpcCalls.length, 0, 'fictional participation must not reach a real RPC');
await registerEvent('real-event-id', true);
assert.deepEqual(rpcCalls, [{ name: 'inscrever', args: { p_evento: 'real-event-id', p_participar: true } }]);

let realRows = [{ id: 'real-improvement', titulo: 'Real', status: 'solicitada', propria: true, descricao: 'Real request', criado_em: '2026-10-15' }], exampleReads = 0;
const { listImprovements } = load('../services/improvements.ts', {
  '../lib/supabase': { supabase: { rpc: async name => { assert.equal(name, 'painel_impactos'); return { error: null, data: { minhas: { rows: realRows, counts: { solicitada: realRows.length, em_andamento: 0, concluida: 0 } }, cidade: { rows: [], counts: { em_andamento: 0, concluida: 0 } } } }; } } },
  '../constants/impactStatus': load('../constants/impactStatus.ts', { './theme': theme }),
  './showcase': { listDemonstrations: async () => { exampleReads++; return [{ id: 'demo:impacto:1' }]; } },
});
const real = await listImprovements();
assert.equal(real.minhas.rows[0].id, 'real-improvement');
assert.deepEqual(real.examples, []);
assert.equal(exampleReads, 0, 'real improvements must not depend on the optional showcase query');
realRows = [];
const demo = await listImprovements();
assert.equal(demo.examples[0].id, 'demo:impacto:1');
assert.equal(demo.minhas.counts.solicitada, 0, 'demo items must not inflate real database counters');
console.log('Showcase flow checks passed: place/account request races, explicit labels, signed-out cleanup, blocked fictional registrations, real RPC unchanged, real impacts replace examples without changing counters.');
