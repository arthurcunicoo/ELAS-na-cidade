import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ensureDependencies,dependencyFingerprint} from '../scripts/dependency-cache.mjs';
const root=await mkdtemp(path.join(tmpdir(),'elas-deps-'));let installs=0;
const versionFile=path.join(root,'node_modules','fixture','package.json');
const lock=version=>JSON.stringify({packages:{'node_modules/fixture':{version}}});
const writeLock=async version=>writeFile(path.join(root,'package-lock.json'),lock(version));
const install=async()=>{installs++;await mkdir(path.dirname(versionFile),{recursive:true});const expected=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8')).packages['node_modules/fixture'].version;await writeFile(versionFile,JSON.stringify({version:expected}));};
try{
 await writeFile(path.join(root,'package.json'),JSON.stringify({dependencies:{fixture:'1.0.0'}}));await writeLock('1.0.0');
 await ensureDependencies(root,{install,log(){}});assert.equal(installs,1);
 await ensureDependencies(root,{install,log(){}});assert.equal(installs,1,'ordinary reopening cannot reinstall');
 await writeFile(path.join(root,'screen.tsx'),'changed UI');await ensureDependencies(root,{install,log(){}});assert.equal(installs,1,'source-only updates reuse dependencies');
 await writeLock('2.0.0');await ensureDependencies(root,{install,log(){}});assert.equal(installs,2,'a changed lockfile updates the installation');
 await rm(versionFile);await ensureDependencies(root,{install,log(){}});assert.equal(installs,3,'partial installation is repaired');
 await writeLock('3.0.0');await assert.rejects(ensureDependencies(root,{install:async()=>{throw Error('offline');},log(){}}),/offline/);
 await ensureDependencies(root,{install,log(){}});assert.equal(installs,4,'failed installs are retried, not marked complete');
 assert.notEqual(dependencyFingerprint('lock',{platform:'win32',arch:'x64',node:'24.1.0'}),dependencyFingerprint('lock',{platform:'linux',arch:'x64',node:'24.1.0'}));
 console.log('Dependency cache passed: one-click install, warm reuse, source-only reuse, changed lock, partial install, failed retry and platform fingerprint.');
}finally{await rm(root,{recursive:true,force:true});}
