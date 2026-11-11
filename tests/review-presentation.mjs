import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createTestDatabase } from '../scripts/test-database.mjs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const theme = load('../constants/theme.ts');
const community = load('../constants/community.ts', { './theme': theme });
const models = load('../features/reviews/presentationReviews.ts', { '../../constants/community': community });
const fixtures = JSON.parse(fs.readFileSync(new URL('../supabase/avaliacoes-apresentacao.json', import.meta.url)));
assert.equal(fixtures.length, 20);
assert.equal(new Set(fixtures.map(row => row.lugar_id)).size, 5);
const rowsFor = place => fixtures.filter(row => row.lugar_id === place).map(row => ({ ...row, tipo: 'avaliacao', ficticio: true, ativo: true, criado_em: '2026-11-04T12:00:00Z' }));
const nereu = rowsFor('nereu'), congresso = rowsFor('congresso');
for (const [place, expected] of [['nereu', 'safe'], ['congresso', 'moderate'], ['osm:way:453621835', 'attention']]) {
  assert.equal(models.presentationClassification(models.parsePresentationReviews(rowsFor(place), place)), expected);
}
for (const change of [{ ficticio: false }, { ativo: false }, { tipo: 'relato' }, { lugar_id: 'other-place' }, { sentimento: 'Atenção' }, { id: 'real-review' }, { criado_em: 'invalid' }]) {
  assert.throws(() => models.parsePresentationReviews([{ ...nereu[0], ...change }], 'nereu'));
}
assert.throws(() => models.parsePresentationReviews([nereu[0], nereu[0]], 'nereu'));
for (const [environment, flag, enabled] of [['production', '1', false], ['staging', '1', false], ['presentation', '0', false], ['presentation', '1', true]]) {
  const source = ts.transpileModule(fs.readFileSync('lib/appMode.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'process', source)(module, module.exports, { env: { EXPO_PUBLIC_APP_ENV: environment, EXPO_PUBLIC_REVIEW_EXAMPLES: flag } });
  assert.equal(module.exports.reviewExamplesEnabled, enabled);
  assert.equal(module.exports.showcaseEnabled, false, 'other sample features stay disabled');
}

// Real service: production opt-out, scoped/limited reads, AbortSignal, validation.
const mode = { reviewExamplesEnabled: false }, calls = [];
let result = { data: nereu, error: null };
const builder = Object.fromEntries(['select', 'eq', 'like', 'order', 'limit', 'abortSignal'].map(method => [method, (...args) => { calls.push([method, ...args]); return builder; }]));
builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
const service = load('../services/presentationReviews.ts', {
  '../lib/appMode': mode,
  '../lib/supabase': { requireBackend: () => ({ from: table => { calls.push(['from', table]); return builder; } }) },
  '../features/reviews/presentationReviews': models,
});
assert.deepEqual(await service.listPresentationReviews('nereu'), []);assert.equal(calls.length, 0);
mode.reviewExamplesEnabled = true;
const controller = new AbortController();
assert.equal((await service.listPresentationReviews('nereu', controller.signal)).length, 4);
for (const expected of [['from', 'conteudos_demonstracao'], ['eq', 'ficticio', true], ['eq', 'lugar_id', 'nereu'], ['like', 'id', 'demo:apresentacao-avaliacao:%'], ['limit', 6], ['abortSignal', controller.signal]]) {
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(expected)), JSON.stringify(expected));
}
result = { data: null, error: Error('fixture transport failure') };
await assert.rejects(service.listPresentationReviews('nereu'));

// Race, account change, retry and logout on the actual hook.
let owner = 'A', placeId = 'nereu', state, renderer;
const pending = [];
const hook = load('../features/reviews/usePresentationReviews.ts', {
  react: React,
  '../auth/SessionProvider': { useSession: () => ({ session: owner ? { user: { id: owner } } : null }) },
  '../../lib/appMode': mode,
  '../../services/presentationReviews': { listPresentationReviews: (placeId, signal) => new Promise((resolve, reject) => pending.push({ placeId, signal, resolve, reject })) },
});
function Probe() { state = hook.usePresentationReviews(placeId); return null; }
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
try {
  await act(async () => { renderer = TestRenderer.create(React.createElement(Probe)); });
  const old = pending.at(-1); placeId = 'congresso';
  await act(async () => renderer.update(React.createElement(Probe)));
  assert.equal(old.signal.aborted, true);
  await act(async () => pending.at(-1).resolve(models.parsePresentationReviews(congresso, 'congresso')));
  await act(async () => old.resolve(models.parsePresentationReviews(nereu, 'nereu')));
  assert.ok(state.rows.every(row => row.placeId === 'congresso'));
  owner = 'B'; await act(async () => renderer.update(React.createElement(Probe)));
  assert.deepEqual(state.rows, [], 'a new account cannot see stale selected-place data');
  await act(async () => pending.at(-1).reject(Error('offline')));assert.equal(state.error, true);
  await act(async () => state.retry());assert.equal(state.loading, true);
  const last = pending.at(-1); owner = ''; await act(async () => renderer.update(React.createElement(Probe)));
  assert.equal(last.signal.aborted, true);assert.equal(state.enabled, false);
  await act(async () => last.resolve(models.parsePresentationReviews(congresso, 'congresso')));
  assert.deepEqual(state.rows, []);await act(async () => renderer.unmount());

  const { RecentReviewExamples } = load('../components/map/RecentReviewExamples.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    '../TouchFeedback': { TouchFeedback: props => React.createElement('TouchFeedback', props, props.children) },
    '../loading/LoadingIndicator': { LoadingIndicator: 'LoadingIndicator' }, '../../constants/theme': theme,
  });
  const props = { reviews: models.parsePresentationReviews(nereu, 'nereu'), loading: false, error: false, expanded: true, onExpand() {}, onRetry() {} };
  await act(async () => { renderer = TestRenderer.create(React.createElement(RecentReviewExamples, props)); });
  const text = renderer.root.findAllByType('Text').map(node => node.children.join(' ')).join(' ');
  assert.match(text, /Avaliações recentes/);assert.match(text, /nomes e comentários fictícios/);
  for (const row of nereu) assert.ok(text.includes(row.nome_exibicao) && text.includes(row.descricao));
  assert.match(text, /não descrevem a segurança real/);
  await act(async () => renderer.update(React.createElement(RecentReviewExamples, { ...props, expanded: false })));
  assert.equal(renderer.root.findByType('TouchFeedback').props.label, 'Ver avaliações de apresentação');
  await act(async () => renderer.update(React.createElement(RecentReviewExamples, { ...props, reviews: [] })));
  assert.equal(renderer.toJSON(), null, 'unseeded places do not receive fake content');
  await act(async () => renderer.unmount());
} finally { console.error = originalError; }

const db = createTestDatabase();
const seed = fs.readFileSync('supabase/AVALIACOES-APRESENTACAO.sql', 'utf8');
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
    create table public.lugares(id text primary key);create table public.avaliacoes(id text primary key);insert into public.avaliacoes values('untouched');`);
  for (const place of new Set(fixtures.map(row => row.lugar_id))) await db.query('insert into public.lugares values($1)', [place]);
  for (const migration of ['20261015173653_app_demonstration_content.sql', '20261028010052_presentation_content_types.sql']) await db.exec(fs.readFileSync('supabase/migrations/' + migration, 'utf8'));
  await db.exec(seed);await db.exec(seed);
  const counts = (await db.query("select count(*)::int total,count(distinct lugar_id)::int places,count(*) filter(where not ficticio)::int real from public.conteudos_demonstracao")).rows[0];
  assert.deepEqual(counts, { total: 20, places: 5, real: 0 });
  assert.deepEqual((await db.query('select * from public.avaliacoes')).rows, [{ id: 'untouched' }]);
  const denied = async sql => { let failed = false; try { await db.exec(sql); } catch { failed = true; } assert.ok(failed, sql); };
  await db.exec('set role anon');await denied('select * from public.conteudos_demonstracao');
  await db.exec("reset role;set role authenticated;select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)");
  assert.equal((await db.query('select count(*)::int n from public.conteudos_demonstracao')).rows[0].n, 20);
  await denied("update public.conteudos_demonstracao set nome_exibicao='Changed'");
  await denied('delete from public.conteudos_demonstracao');
  await denied("insert into public.conteudos_demonstracao(id,tipo,titulo,descricao) values('demo:fake','evento','Fake','not allowed')");
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  assert.equal((await db.query('select count(*)::int n from public.conteudos_demonstracao')).rows[0].n, 0);
} finally { await db.close(); }
console.log('Review presentation passed: 20 labeled samples/5 places, three example classes, production opt-out, real data untouched, bounded authenticated reads, cancellation/account/retry races, visible fictional labels and idempotent/RLS-protected seed.');
