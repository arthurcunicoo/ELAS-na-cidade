import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url);
const oldConsole=console.error;
console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))oldConsole(...args);};
let nextId=0, renderer, motion, path='/mapa', reduced=false, gateway, active;
const timers=new Map(), frames=new Map(), transitions=[], routes=[];
const attributes=new Map();
const style={removeProperty(name){delete this[name];}};
const scene={
 style,setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name),
 addEventListener(name,end){
  assert.equal(name,'transitionend');
  active={end,from:{transform:style.transform,opacity:style.opacity},detached:false};
  transitions.push(active);
 },
 removeEventListener(name,end){
  assert.equal(name,'transitionend');
  assert.equal(active.end,end);
  active.detached=true;
  active=null;
 },
};
globalThis.getComputedStyle=()=>active?.from??{transform:style.transform??'none',opacity:style.opacity??'1'};
globalThis.requestAnimationFrame=fn=>{const id=++nextId;frames.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const native={View:'View',StyleSheet:{create:value=>value}};
const mocks={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,
 '../../lib/navigation':{registerNavigationTransition(fn){gateway=fn;return ()=>{if(gateway===fn)gateway=null;};}},
};
const source=ts.transpileModule(fs.readFileSync(new URL('../components/navigation/TabTransition.web.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('require','module','exports','setTimeout','clearTimeout',source)(name=>{
 assert.ok(name in mocks,'unexpected dependency '+name);return mocks[name];
},module,module.exports,fn=>{const id=++nextId;timers.set(id,fn);return id;},id=>timers.delete(id));
const {TabTransitionProvider,TabTransitionViewport,useTabTransition}=module.exports;
function Controls(){motion=useTabTransition();return null;}
const tree=()=>React.createElement(TabTransitionProvider,{path,reduced},React.createElement(TabTransitionViewport,null,React.createElement('Screen')),React.createElement(Controls));
const update=()=>act(async()=>renderer.update(tree()));
const step=async()=>act(async()=>{const current=[...frames.values()];frames.clear();current.forEach(fn=>fn());});
const paint=async()=>{await step();await step();};
const go=destination=>act(async()=>gateway(destination,()=>routes.push(destination)));
const complete=async(transition=transitions.at(-1),target=scene)=>act(async()=>transition.end({target,propertyName:'opacity'}));
try {
 await act(async()=>{renderer=TestRenderer.create(tree(),{createNodeMock:element=>element.props.testID==='tab-transition-scene'?scene:{}});});
 assert.equal(style.transform,undefined,'idle scene has no transform');
 await go('/eventos');assert.equal(motion.moving,true);assert.deepEqual(routes,[]);
 assert.equal(transitions.at(-1).from.opacity,'1');
 assert.equal(style.opacity,'0.64');
 assert.match(style.transition,/opacity 145ms.*transform 145ms/);
 assert.ok(!style.transition.includes('filter'),'a transition must not blur the full viewport');
 await complete(undefined,{});assert.equal(motion.moving,true,'nested transitions cannot complete navigation');
 await complete();await step();assert.deepEqual(routes,[],'outgoing frame must reach a paint boundary');await step();
 assert.deepEqual(routes,['/eventos']);path='/eventos';await update();
 assert.equal(style.opacity,'0.60','destination starts with the incoming fade');
 assert.match(style.transform,/20px/);
 await paint();await complete();
 assert.equal(style.transition,undefined);assert.equal(style.transform,undefined);
 assert.equal(attributes.has('data-elas-motion'),false);assert.equal(motion.moving,false);
 await go('/alertas');const cancelled=transitions.at(-1);await go('/perfil');
 assert.equal(cancelled.detached,true);await complete(cancelled);await paint();assert.deepEqual(routes,['/eventos']);
 await complete();await paint();assert.deepEqual(routes,['/eventos','/perfil']);path='/perfil';await update();await paint();await complete();
 await go('/alertas');await complete();await paint();assert.equal(routes.at(-1),'/alertas');
 await go('/eventos');path='/alertas';await update();
 assert.equal(motion.moving,true,'a late route commit does not erase the newer tap');
 await paint();assert.equal(routes.at(-1),'/eventos');
 path='/eventos';await update();await paint();await complete();
 let opened=0,closed=0;
 await act(async()=>motion.openPanel(()=>opened++));await complete();
 assert.equal(opened,1);assert.equal(style.opacity,'0.87');assert.equal(motion.moving,true);
 await act(async()=>motion.closePanel(()=>closed++));await paint();await complete();
 assert.equal(closed,1);assert.equal(style.transition,undefined);assert.equal(motion.moving,false);
 await go('/mapa');const interrupted=transitions.at(-1);reduced=true;await update();
 assert.equal(interrupted.detached,true);assert.equal(routes.at(-1),'/mapa');
 const count=routes.length;await complete(interrupted);await paint();assert.equal(routes.length,count,'reduced motion consumes the pending action once');
 assert.equal(style.transition,undefined);assert.equal(motion.moving,false);
 await go('/alertas');assert.equal(routes.at(-1),'/alertas');assert.equal(motion.moving,false);
 path='/alertas';await update();await paint();
 assert.deepEqual(transitions.at(-1).from,{transform:'none',opacity:'0.60'});
 assert.equal(style.transform,'none','reduced motion retains a visible fade without moving the route');
 assert.equal(style.opacity,'1');
 await complete();assert.equal(style.opacity,undefined);
 assert.equal(style.transition,undefined);
 await act(async()=>renderer.unmount());assert.equal(gateway,null);assert.equal(timers.size,0);assert.equal(frames.size,0);
 console.log('Web route motion passed: composited exit/arrival, cleanup, interrupted navigation, sheet and opacity-only reduced motion.');
}finally{
 console.error=oldConsole;
 delete globalThis.getComputedStyle;delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;
}
