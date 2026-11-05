import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';

export function dependencyFingerprint(lock,{platform=process.platform,arch=process.arch,node=process.versions.node}={}) {
 return createHash('sha256').update(lock).update([platform,arch,node.split('.')[0]].join(':')).digest('hex');
}
export async function ensureDependencies(root,{install=runInstall,log=console.log}={}) {
 const [manifestText,lockText]=await Promise.all(['package.json','package-lock.json'].map(name=>readFile(path.join(root,name),'utf8')));
 const manifest=JSON.parse(manifestText),lock=JSON.parse(lockText),stamp=path.join(root,'node_modules','.elas-dependencies.json');
 const fingerprint=dependencyFingerprint(lockText);
 let previous;try{previous=JSON.parse(await readFile(stamp,'utf8')).fingerprint;}catch{}
 const dependencies={...manifest.dependencies,...manifest.devDependencies};
 const missing=(await Promise.all(Object.keys(dependencies).map(async name=>{
  try{const actual=JSON.parse(await readFile(path.join(root,'node_modules',name,'package.json'),'utf8'));
   const expected=lock.packages?.['node_modules/'+name]?.version;
   return expected&&expected!==actual.version?name:null;
  }catch{return name;}
 }))).filter(Boolean);
 if(missing.length||(previous&&previous!==fingerprint)){
  log('Atualizando as dependências do ELAS. Nas próximas aberturas, elas serão reaproveitadas.');
  await install(root);
 }
 await mkdir(path.dirname(stamp),{recursive:true});
 await writeFile(stamp,JSON.stringify({fingerprint,platform:process.platform,arch:process.arch})+'\n');
 return {installed:Boolean(missing.length||(previous&&previous!==fingerprint))};
}
function runInstall(root){
 return new Promise((resolve,reject)=>{
  // Only a fixed npm command is passed to the Windows shell; no user input.
  const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['ci','--no-audit','--no-fund'],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Não foi possível instalar as dependências. Confira sua conexão e abra o atalho novamente.')));
 });
}
