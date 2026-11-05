import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_EXECUTABLE?{executablePath:process.env.QA_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
const base=process.env.QA_WELCOME_URL??'http://localhost:8086',checks=[];
try {
 for(const viewport of [{width:357,height:706},{width:320,height:568}]) {
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});await page.getByTestId('auth-email').waitFor({timeout:90000});
  assert.equal(await page.getByText('PASSO 1 DE 4',{exact:false}).count(),0,'direct login and reload cannot auto-open the tour');
  await page.goto(base,{waitUntil:'domcontentloaded'});
  const start=page.getByRole('button',{name:'Começar',exact:true});await start.waitFor({timeout:90000});
  assert.equal(await page.getByText('PASSO 1 DE 4',{exact:false}).count(),0,'the app starts at the original welcome template');
  assert.equal(await page.getByText('exemplos fictícios',{exact:false}).count(),0);
  const bounds=await start.boundingBox();assert.ok(bounds&&bounds.width>=viewport.width*.58&&bounds.height>=52);
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);
  assert.ok(bounds.y+bounds.height<=viewport.height,'start action fits a small viewport');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1400);
  if(process.env.QA_WELCOME_SCREENSHOTS){await mkdir(process.env.QA_WELCOME_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.QA_WELCOME_SCREENSHOTS+'/welcome-'+viewport.width+'.png'});}
  await page.getByTestId('welcome-how-it-works').click();
  await page.getByText('PASSO 1 DE 4',{exact:false}).waitFor();
  await page.goto(base,{waitUntil:'domcontentloaded'});await start.waitFor();
  await start.click();await page.getByTestId('auth-email').waitFor();assert.ok(new URL(page.url()).pathname==='/login');
  assert.equal(await page.getByText('PASSO 1 DE 4',{exact:false}).count(),0,'Começar goes directly to login');
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByRole('link',{name:'Cadastrar',exact:true}).click();
  await page.getByTestId('auth-email').waitFor();assert.equal(new URL(page.url()).pathname,'/cadastro');
  assert.deepEqual(errors,[],'welcome, login and registration have no browser runtime exceptions');
  checks.push({viewport,welcome:true,optionalTour:true,login:true,registration:true,runtimeErrors:errors.length});await context.close();
 }
 console.log(JSON.stringify({test:'real Expo web welcome/navigation',checks}));
 if(process.env.QA_WELCOME_OUTPUT)await writeFile(process.env.QA_WELCOME_OUTPUT,JSON.stringify(checks,null,2));
} finally {await browser.close();}
