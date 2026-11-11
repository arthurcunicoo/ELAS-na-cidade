import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {bundledBackend} from '../constants/backendPublic.ts';

// Run from a clean copy with the public Supabase variables unset.
assert.ok(!existsSync('.env')&&!existsSync('.env.local'),'test must not use a local .env');
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER_EXECUTABLE,args:['--no-sandbox']});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let attempts=0,configMatched=false;
 await context.route('https://*.supabase.co/**',async route=>{
  const request=route.request(), url=new URL(request.url());
  if(url.pathname!=='/auth/v1/token')return route.abort();
  configMatched=url.origin===bundledBackend.url&&request.headers().apikey===bundledBackend.key;
  attempts++;
  const apiKeyFailure=attempts===1;
  await route.fulfill({
   status:apiKeyFailure?401:400,contentType:'application/json',
   body:JSON.stringify(apiKeyFailure
    ? {message:'Invalid API key'}
    : {error_code:'invalid_credentials',msg:'Invalid login credentials'}),
  });
 });
 await page.goto(process.env.QA_WELCOME_URL,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Começar',exact:true}).click({timeout:90000});
 await page.getByTestId('auth-email').fill('config-qa@example.invalid');
 await page.getByTestId('auth-password').fill('fixture-only');
 const enter=page.getByRole('button',{name:'Entrar',exact:true});
 await enter.click();
 await page.getByText('A chave pública do Supabase não foi aceita.',{exact:false}).waitFor();
 assert.equal(configMatched,true,'the bundled project and public API key must reach the login API');
 await enter.click();
 await page.getByText('E-mail ou senha incorretos.',{exact:true}).waitFor();
 assert.equal(attempts,2);assert.deepEqual(errors,[]);
 await context.close();
 console.log('Clean Expo browser passed: startup without .env, real login request configured for ELAS, distinct API-key and password errors (simulated responses).');
}finally{await browser.close();}
await import('./expo-go-compat.mjs');
