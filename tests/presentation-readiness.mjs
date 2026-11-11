import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url);
const host=name=>props=>React.createElement(name,props,props.children);
let params={kind:'relato',id:'own-report'}, renderer;
const row={id:'own-report',proprio:true,categoria:'Iluminação',descricao:'Registro original preservado',status:'pendente',atualizado_em:'2026-11-10T12:00:00Z'};
const writes=[];
const mocks={
 'react':React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':{Text:host('Text'),View:host('View')},
 'expo-router':{useLocalSearchParams:()=>params,useFocusEffect:fn=>React.useEffect(fn,[fn])},
 '../lib/navigation':{router:{navigate(){}}},
 '../components/loading/LoadingState':{LoadingState:host('LoadingState')},
 '../components/shared/FeaturePage':{FeaturePage:host('FeaturePage'),Action:host('Action'),Message:host('Message'),shared:{}},
 '../features/reports/records':{
  recordDetail:async()=>({...row,status:params.kind==='melhoria'?'solicitada':'pendente'}),
  updateRecord:async(...args)=>writes.push(args),statusLabels:{pendente:'Em análise',solicitada:'Solicitada'},
 },
 '../features/reports/HistoryList':{HistoryList:host('HistoryList')},
 '../lib/supabase':{friendlyError:()=> 'Falha'},
};
const source=ts.transpileModule(fs.readFileSync('app/registro.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('require','module','exports',source)(name=>{
 assert.ok(name in mocks,'Unexpected dependency '+name);
 return mocks[name];
},module,module.exports);
const Screen=module.exports.default;
const originalError=console.error;
console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
try {
 for(const kind of ['relato','melhoria','avaliacao']){
  params={kind,id:row.id};
  await act(async()=>{renderer=TestRenderer.create(React.createElement(Screen));});
  const actions=()=>renderer.root.findAllByType('Action');
  assert.ok(actions().every(a=>!['Editar avaliação','Corrigir meu registro','Salvar correção'].includes(a.props.title)),'details do not offer removed edit actions');
  assert.equal(renderer.root.findAllByType('HistoryList').length,1,'history remains available');
  if(kind==='avaliacao'){
   assert.ok(actions().every(a=>a.props.title!=='Retirar meu registro'));
  }else{
   await act(async()=>actions().find(a=>a.props.title==='Retirar meu registro').props.onPress());
   assert.equal(writes.length,kind==='relato'?0:1,'opening confirmation must not modify a record');
   await act(async()=>actions().find(a=>a.props.title==='Confirmar retirada').props.onPress());
   const call=writes.at(-1);
   assert.equal(call[0],kind);assert.equal(call[1].id,row.id);
   assert.equal(call[2].descricao,row.descricao);assert.equal(call[3],true,'withdrawal must preserve the original text');
  }
  await act(async()=>renderer.unmount());
 }
 console.log('Presentation readiness passed: removed edit actions for all detail types; history retained; withdrawal asks for confirmation and preserves text.');
}finally{console.error=originalError;}
