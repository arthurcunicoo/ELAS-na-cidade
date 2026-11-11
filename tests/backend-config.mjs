import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(file,mocks={},env={}){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports','process',code)(name=>name in mocks?mocks[name]:require(name),module,module.exports,{env});
 return module.exports;
}
const defaults={url:'https://project-a.supabase.co',key:'sb_publishable_fixture-public'};
const {resolveBackendConfig:resolve}=load('lib/backendConfig.ts',{'../constants/backendPublic':{bundledBackend:defaults}});
const jwt=(role='anon',ref='project-a')=>[
 Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),
 Buffer.from(JSON.stringify({role,ref,iss:'supabase'})).toString('base64url'),
 'fixture-signature',
].join('.');
const legacy=jwt();
let tests=0;
function ready(env,expected=defaults,fallback=defaults){
 const result=resolve(env,fallback);
 assert.equal(result.error,'');assert.equal(result.url,expected.url);assert.equal(result.key,expected.key);tests++;
 return result;
}
function blocked(env,message,fallback=defaults){
 const result=resolve(env,fallback);
 assert.ok(result.error.includes(message),result.error);
 assert.equal(result.key,'');assert.equal(result.url,'');tests++;
}
assert.equal(ready({}).source,'bundled');
assert.equal(ready({appEnv:'presentation'}).source,'bundled');
ready({url:'  "HTTPS://PROJECT-A.SUPABASE.CO/"  ',publishableKey:" 'sb_publishable_fixture-public'\r\n "});
ready({url:defaults.url});
ready({publishableKey:defaults.key});
for(const field of ['publishableKey','anonKey','key']){
 ready({url:defaults.url,[field]:legacy},{...defaults,key:legacy});
}
ready({anonKey:legacy},{...defaults,key:legacy});
ready({publishableKey:'',anonKey:legacy},{...defaults,key:legacy});
ready({url:'https://other.supabase.co',publishableKey:'sb_publishable_other'},{url:'https://other.supabase.co',key:'sb_publishable_other'});
ready({appEnv:'staging',url:'https://other.supabase.co',publishableKey:'sb_publishable_other'},{url:'https://other.supabase.co',key:'sb_publishable_other'});
ready({appEnv:'production',url:defaults.url,publishableKey:defaults.key});
blocked({appEnv:'staging'},'URL');
blocked({appEnv:'production'},'URL');
blocked({url:'https://other.supabase.co'},'chave');
blocked({publishableKey:'sb_publishable_unrelated'},'URL');
blocked({url:'https://supabase.com/dashboard/project/anything',publishableKey:defaults.key},'URL');
blocked({url:'https://project-a.supabase.co/rest/v1',publishableKey:defaults.key},'URL');
blocked({url:'http://project-a.supabase.co',publishableKey:defaults.key},'URL');
blocked({url:defaults.url,publishableKey:'sb_secret_do-not-use'},'administrativa');
blocked({url:defaults.url,publishableKey:jwt('service_role'),anonKey:legacy},'administrativa');
blocked({url:defaults.url,publishableKey:jwt('authenticated')},'pública');
blocked({url:defaults.url,publishableKey:jwt('anon','other')},'diferentes');
blocked({url:defaults.url,publishableKey:'sb_publishable_'},'pública');
blocked({url:defaults.url,publishableKey:'sb_publishable_broken key'},'pública');
blocked({url:defaults.url,publishableKey:'not-a-key'},'pública');
blocked({url:defaults.url,publishableKey:'eyJ.invalid.broken'},'pública');
const errors=load('lib/errors.ts');
assert.ok(errors.friendlyError({status:401,message:'Invalid API key'}).includes('mesmo projeto'));
assert.equal(errors.friendlyError({status:400,code:'invalid_credentials',message:'Invalid login credentials'}),'E-mail ou senha incorretos.');
console.log(tests+' backend configuration checks passed: bundled presentation, clean overrides, aliases, public anon JWT, privileged key rejection, project mismatch, staging isolation and actionable API errors.');
