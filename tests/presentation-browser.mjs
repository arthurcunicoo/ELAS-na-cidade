import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER_EXECUTABLE,args:['--no-sandbox']});
try{
 for(const viewport of [{width:320,height:568},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let mailRequests=0;
  await context.route('https://*.supabase.co/**',route=>{
   assert.ok(new URL(route.request().url()).pathname.endsWith('/auth/v1/recover'),'password recovery only requests the mail API');
   mailRequests++;
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.goto(process.env.QA_WELCOME_URL+'/login',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'Esqueci minha senha',exact:true}).click({timeout:90000});
  const input=page.getByTestId('recovery-email'),button=page.getByRole('button',{name:'Enviar código',exact:true});
  await input.waitFor();
  await button.scrollIntoViewIfNeeded();
  const field=await input.boundingBox(), action=await button.boundingBox();
  assert.ok(action.y-field.y-field.height>=12,'recovery button is separated from the email input');
  await button.click();
  await page.getByText('Informe um e-mail válido.',{exact:true}).waitFor();
  assert.equal(mailRequests,0);
  await input.fill('local-qa@example.invalid');await button.click();
  await page.getByTestId('recovery-code').waitFor();
  assert.equal(mailRequests,1);assert.deepEqual(errors,[]);
  console.log('Recovery UI passed:',viewport.width+'x'+viewport.height,'spacing, validation and transition to code; mail delivery is simulated');
  await context.close();
 }
}finally{await browser.close();}
await import('./welcome-flow.mjs');
await import('./tab-browser.mjs');
await import('./expo-go-compat.mjs');
