import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {ensureDependencies} from './dependency-cache.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
try {
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(!((major===24&&minor>=3)||major>=26))throw Error('Instale o Node.js 24.3 ou superior da linha 24, ou Node.js 26+, para abrir o ELAS com Expo SDK 58.');
 await ensureDependencies(root);
 const child=spawn(process.execPath,[require.resolve('expo/bin/cli'),'start','--go','--clear',...process.argv.slice(2)],{
  cwd:root,env:{...process.env,EXPO_PUBLIC_DEMO:'0',EXPO_PUBLIC_SHOWCASE:process.env.EXPO_PUBLIC_SHOWCASE??'1',EXPO_PUBLIC_APP_ENV:'presentation',EXPO_PUBLIC_REVIEW_EXAMPLES:process.env.EXPO_PUBLIC_REVIEW_EXAMPLES??'1'},stdio:'inherit',
 });
 child.on('error',()=>{console.error('Não foi possível abrir o Expo. Abra o atalho novamente.');process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
}catch(error){console.error(error.message);process.exitCode=1;}
