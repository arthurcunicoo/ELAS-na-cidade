import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url),originalError=console.error;
console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
const timers=new Map(),animations=[],dispatched=[],frames=new Map();
globalThis.requestAnimationFrame=callback=>{const id=++timerId;frames.set(id,callback);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
const paint=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback());};
let timerId=0,motion,renderer,path='/mapa',reduced=false;
class Value {
 constructor(value){this.current=value;}
 get value(){return this.current;}
 set value(value){
  if(!value?.animation){this.current=value;return;}
  const entry={value:this,config:{...value.config,toValue:value.toValue},callback:result=>value.callback?.(result.finished),stop(){this.stopped=true;this.callback({finished:false});}};
  this.running=entry;animations.push(entry);
 }
 setValue(value){this.current=value;}
}
const native={View:'View',StyleSheet:{create:x=>x,absoluteFill:{}},Platform:{OS:'android',Version:30}};
const reanimated={__esModule:true,default:{View:'AnimatedView',createAnimatedComponent:()=> 'AnimatedBlurView'},
 useSharedValue:value=>React.useRef(new Value(value)).current,useAnimatedStyle:fn=>({...fn(),evaluate:fn}),useAnimatedProps:fn=>({...fn(),evaluate:fn}),
 Easing:{cubic:x=>x,quad:x=>x,out:x=>x,inOut:x=>x},runOnJS:fn=>fn,
 cancelAnimation:value=>{value.running?.stop();value.running=null;},
 withTiming:(toValue,config,callback)=>({animation:true,toValue,config,callback}),
};
function load(file,mocks){
 const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}};
 new Function('require','module','exports','setTimeout','clearTimeout',code)(name=>{
  if(name in mocks)return mocks[name];if(name==='react')return React;if(name==='react/jsx-runtime')return require(name);throw Error('Unmocked '+name);
 },module,module.exports,callback=>{const id=++timerId;timers.set(id,callback);return id;},id=>timers.delete(id));return module.exports;
}
const raw={push:href=>dispatched.push(href),navigate:href=>dispatched.push(href),replace:href=>dispatched.push(href),back:()=>dispatched.push('BACK'),canGoBack:()=>{throw Error('imperative router is not bound yet');},setParams:()=>{throw Error('imperative router is not bound yet');}};
const navigation=load('../lib/navigation.ts',{'expo-router':{router:raw}});
// Expo SDK 58 replaces pre-mount method stubs after its first render.
raw.canGoBack=()=>true;let appliedParams;raw.setParams=value=>{appliedParams=value;};
assert.equal(navigation.router.canGoBack(),true,'do not snapshot the pre-mount router stub');
navigation.router.setParams({placeId:'fixture'});assert.deepEqual(appliedParams,{placeId:'fixture'});
const {TabTransitionProvider,TabTransitionViewport,useTabTransition}=load('../components/navigation/TabTransition.tsx',{
 'react-native':native,'react-native-reanimated':reanimated,'expo-blur':{BlurTargetView:'BlurTargetView',BlurView:'BlurView'},'../../lib/navigation':navigation,
});
function Controls(){motion=useTabTransition();return React.createElement('Navigation');}
const tree=()=>React.createElement(TabTransitionProvider,{path,reduced},React.createElement(TabTransitionViewport,null,React.createElement('Screen')),React.createElement(Controls));
const paintDestination=()=>act(async()=>{paint();paint();});
const update=async()=>{await act(async()=>renderer.update(tree()));await paintDestination();};
const go=destination=>act(async()=>motion.navigate(destination,()=>dispatched.push(destination)));
const finish=entry=>act(async()=>{entry.value.setValue(entry.config.toValue);entry.callback({finished:true});paint();paint();});
const blur=()=>renderer.root.findAllByType('AnimatedBlurView');
try {
 await act(async()=>{renderer=TestRenderer.create(tree());});assert.equal(motion.moving,false);assert.equal(blur().length,0);
 await go('/alertas');assert.equal(dispatched.length,0);assert.equal(motion.moving,true);assert.equal(blur().length,1);
 assert.equal(blur()[0].props.blurMethod,'dimezisBlurView','Android 7–11 must not silently disable blur');assert.equal(blur()[0].props.pointerEvents,'none');
 assert.equal(animations.at(-1).config.duration,260,'outgoing blur is visible before navigation');
 await act(async()=>{const entry=animations.at(-1);entry.value.setValue(entry.config.toValue);entry.callback({finished:true});});
 assert.equal(blur()[0].props.animatedProps.evaluate().intensity,85,'native changes blur intensity itself');
 assert.equal(dispatched.length,0,'the outgoing blur must be painted before navigation');
 await act(async()=>paint());assert.equal(dispatched.length,0,'navigation waits for a complete paint boundary');
 await act(async()=>paint());assert.equal(dispatched.at(-1),'/alertas');path='/alertas';
 const beforeArrival=animations.length;await act(async()=>renderer.update(tree()));
 assert.equal(animations.length,beforeArrival,'focus waits for the destination to paint');
 assert.equal(motion.progress.value,1,'the destination starts fully defocused');
 await act(async()=>paint());assert.equal(animations.length,beforeArrival);
 await act(async()=>paint());assert.equal(animations.at(-1).config.toValue,0);assert.equal(animations.at(-1).config.duration,340);
 await finish(animations.at(-1));assert.equal(motion.moving,false);assert.equal(blur().length,0);assert.equal(timers.size,0);
 // The exact requested path: Relatos defocuses, then Mapa enters in focus.
 await go('/mapa');const leaving=animations.at(-1);assert.equal(path,'/alertas');await finish(leaving);assert.equal(dispatched.at(-1),'/mapa');
 path='/mapa';await update();await finish(animations.at(-1));
 let opened=0,closed=0;
 await act(async()=>motion.openPanel(()=>opened++));assert.equal(opened,1);assert.equal(motion.moving,true);
 await finish(animations.at(-1));assert.equal(motion.progress.value,1,'Participar keeps the background defocused while its sheet is open');
 await act(async()=>motion.closePanel(()=>closed++));await paintDestination();await finish(animations.at(-1));assert.equal(closed,1);assert.equal(motion.moving,false);
 await go('/eventos');const stale=animations.at(-1);await go('/perfil');const latest=animations.at(-1),count=dispatched.length;
 assert.equal(stale.stopped,true);await finish(stale);assert.equal(dispatched.length,count,'stale callbacks cannot navigate');await finish(latest);
 path='/perfil';await update();await finish(animations.at(-1));
 // All profile options and Back use the same coordinator, not an unrelated fade.
 for(const destination of ['/configuracoes','/informacoes-pessoais','/minhas-avaliacoes','/favoritos','/meus-relatos','/minhas-solicitacoes','/notificacoes','/conquistas','/foto-perfil']){
  const before=dispatched.length;await act(async()=>navigation.router.push(destination));assert.equal(dispatched.length,before);assert.equal(motion.moving,true);
  await finish(animations.at(-1));assert.equal(dispatched.at(-1),destination);path=destination;await update();await finish(animations.at(-1));
  await act(async()=>navigation.router.back());assert.equal(motion.moving,true);await finish(animations.at(-1));assert.equal(dispatched.at(-1),'BACK');
  path='/perfil';await update();await finish(animations.at(-1));
 }
 await go('/mapa');await finish(animations.at(-1));await act(async()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(callback=>callback());});await paintDestination();await finish(animations.at(-1));assert.equal(motion.moving,false);
 await go('/eventos');const old=animations.at(-1);reduced=true;await update();assert.equal(dispatched.at(-1),'/eventos');assert.equal(motion.moving,false);assert.equal(motion.progress.value,0);
 const before=dispatched.length;await finish(old);assert.equal(dispatched.length,before);await go('/mapa');assert.equal(motion.moving,false);
 reduced=false;path='/mapa';native.Platform.Version=31;await update();await finish(animations.at(-1));
 await go('/eventos');assert.equal(blur().length,0,'Android 12+ blurs the scene without capturing the native stack');
 await finish(animations.at(-1));
 const androidStyle=renderer.root.findByProps({'testID':'tab-transition-scene'}).props.style[1].evaluate();
 assert.deepEqual(androidStyle.filter,[{blur:14}]);assert.equal(androidStyle.opacity,.60);
 path='/eventos';await update();await finish(animations.at(-1));
 native.Platform.OS='ios';await update();await go('/perfil');assert.equal(blur().length,1,'iOS retains native backdrop blur');
 await finish(animations.at(-1));assert.equal(blur()[0].props.animatedProps.evaluate().intensity,85);
 path='/perfil';await update();await finish(animations.at(-1));
 native.Platform.OS='web';await update();
 await go('/mapa');const last=animations.at(-1);assert.equal(blur().length,0,'web uses a real foreground filter, not a translucent overlay');
 await act(async()=>renderer.unmount());const size=dispatched.length;await finish(last);assert.equal(dispatched.length,size);assert.equal(timers.size,0);
 navigation.router.push('/perfil');assert.equal(dispatched.at(-1),'/perfil','unmounted roots release the gateway');
  // Real reduced-motion hook: browser changes and a late native preference read.
  let currentReduced, changed, removed = false;
  const preference = {matches: true, addEventListener: (_event, callback) => {changed = callback;}, removeEventListener: () => {removed = true;}};
  globalThis.window = {matchMedia: () => preference};
  const hookNative = {Platform: {OS: 'web'}, AccessibilityInfo: {}};
  const {useReducedMotion} = load('../hooks/useReducedMotion.ts', {'react-native': hookNative});
  function PreferenceProbe() {currentReduced = useReducedMotion(); return null;}
  await act(async () => {renderer = TestRenderer.create(React.createElement(PreferenceProbe));});
  assert.equal(currentReduced,true);
  await act(async () => {preference.matches = false; changed();}); assert.equal(currentReduced,false);
  await act(async () => renderer.unmount()); assert.equal(removed,true); delete globalThis.window;
  let resolvePreference, nativeChange;
  hookNative.Platform.OS = 'ios';
  hookNative.AccessibilityInfo = {isReduceMotionEnabled: () => new Promise(resolve => {resolvePreference = resolve;}), addEventListener: (_event, callback) => {nativeChange = callback; return {remove() {}};}};
  await act(async () => {renderer = TestRenderer.create(React.createElement(PreferenceProbe));});
  assert.equal(currentReduced,true,'native starts conservatively until the preference is read');
  await act(async () => nativeChange(true));
  await act(async () => resolvePreference(false)); assert.equal(currentReduced,true,'late reads cannot override a new system preference');
  await act(async () => renderer.unmount());
  console.log('Route focus passed: Relatos → Mapa, all profile options and Back, Android 12+ scene filter, Android 7–11/iOS native blur, exit/arrival paint boundaries, rapid taps, cancellation, timeout, cleanup and reduced motion.');
} finally {console.error = originalError; delete globalThis.window; delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame;}
