import assert from 'node:assert/strict';
import { fetchOsmPayload, readBoundedJson } from '../supabase/functions/lugares-osm/network.js';

const query='[out:json];nwr["name"](-28.69,-49.38,-28.67,-49.36);out center;';
let calls=[];
const success=await fetchOsmPayload(query,async(url,options)=>{calls.push({url,options});return Response.json({elements:[]});});
assert.equal(calls.length,1);
assert.equal(success.endpoint,'https://overpass.private.coffee/api/interpreter');
assert.equal(calls[0].options.method,'POST');
assert.equal(new URLSearchParams(calls[0].options.body).get('data'),query);
assert.equal(calls[0].options.headers['Content-Type'],'application/x-www-form-urlencoded; charset=UTF-8');
assert.match(calls[0].options.headers['User-Agent'],/ELAS-na-Cidade.*elas-na-cidade\.netlify\.app/);

for(const status of [406,429,503]){
 calls=[];
 await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);return new Response('',{status});}),error=>error.status===status);
 assert.deepEqual(calls,[success.endpoint],'only the scheduled queue may retry failed requests');
}
calls=[];
await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);return Response.json({elements:[],remark:'runtime error: Query timed out'});}),/incomplete_response/);
assert.equal(calls.length,1);
await assert.rejects(()=>readBoundedJson(new Response('invalid JSON')),/invalid_json/);
await assert.rejects(()=>readBoundedJson(new Response('{}',{headers:{'Content-Length':'100'}}),5),/response_too_large/);

let cancelled=false;
const oversized=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(6));},cancel(){cancelled=true;}}));
await assert.rejects(()=>readBoundedJson(oversized,5),/response_too_large/);
assert.equal(cancelled,true);
const utf8=new TextEncoder().encode('{"nome":"Praça"}');
const streamed=new Response(new ReadableStream({start(controller){for(const byte of utf8)controller.enqueue(Uint8Array.of(byte));controller.close();}}));
assert.deepEqual(await readBoundedJson(streamed),{nome:'Praça'});
calls=[];
await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);throw new TypeError('Network error');}),/Network error/);
assert.deepEqual(calls,[success.endpoint]);
console.log('OSM network checks passed: one identified request per lease, quota handling, incomplete responses, stream limits and UTF-8. Transport responses are simulated.');
