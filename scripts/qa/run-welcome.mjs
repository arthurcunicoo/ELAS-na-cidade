import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {open} from 'node:fs/promises';
const require=createRequire(import.meta.url),log=await open(process.env.QA_WELCOME_SERVER_LOG??'../welcome-server.log','w');
const port=process.env.QA_WELCOME_PORT??'8086',url='http://localhost:'+port;
const launcher=process.env.QA_PRESENTATION_LAUNCH==='1'?['scripts/presentation.mjs']: [require.resolve('expo/bin/cli'),'start'];
const server=spawn(process.execPath,[...launcher,'--web','--localhost','--clear','--max-workers','2','--port',port],{
 env:{...process.env,EXPO_OFFLINE:'1',CI:'1',EXPO_PUBLIC_DEMO:'0',EXPO_PUBLIC_SHOWCASE:'0'},stdio:['ignore',log.fd,log.fd],
});
try {
 let ready=false;
 for(let n=0;n<240;n++){
  if(server.exitCode!==null)throw Error('Expo stopped before the welcome test');
  try {const response=await fetch(url,{signal:AbortSignal.timeout(500)});if(response.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!ready)throw Error('Expo did not become ready');
 const test=spawn(process.execPath,[process.argv[2]??process.env.QA_BROWSER_TEST??'tests/welcome-flow.mjs'],{env:{...process.env,QA_WELCOME_URL:url},stdio:'inherit'});
 process.exitCode=await new Promise((resolve,reject)=>{test.on('error',reject);test.on('exit',code=>resolve(code??1));});
} finally {server.kill('SIGTERM');await log.close();}
