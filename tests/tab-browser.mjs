import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// Run the actual Expo app. Every Supabase request is intercepted: synthetic
// credentials/reviews never leave this isolated browser or reach the live DB.
const browser = await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER_EXECUTABLE,args:['--no-sandbox']});
const base = process.env.QA_WELCOME_URL??'http://localhost:8086', checks=[];
const uid='11111111-1111-4111-8111-111111111111', placeId='qa-place';
const place={id:placeId,nome:'Praça de teste',endereco:'Centro',latitude:-28.678,longitude:-49.369,tags:{leisure:'park'},ativo:true};
const event={id:'qa-event',titulo:'Caminhada de teste no centro',descricao:'Evento de teste isolado.',local_texto:'Centro',inicia_em:new Date(Date.now()+86400000).toISOString(),cancelado:false,inscrito:false};
const policy={versao:2,metodo:'Percepções comunitárias aprovadas; mínimo de uma avaliação.'};
const now=()=>new Date().toISOString();
let debugPage,debugUnknown;
const viewports=process.env.QA_TAB_DESKTOP==='1'
 ? [{width:1440,height:900},{width:1920,height:1080}]
 : [{width:357,height:706},{width:320,height:568}];
try {
 for (const viewport of viewports.filter(viewport=>!process.env.QA_TAB_WIDTH||viewport.width===Number(process.env.QA_TAB_WIDTH))) {
  const context=await browser.newContext({viewport,reducedMotion:'no-preference'}), page=await context.newPage(), errors=[], unknown=[];
  let own=null,approved=null;
  const savedReviews=[];
  debugPage=page;debugUnknown=unknown;
  page.on('pageerror',error=>errors.push(error.message));
  await context.route(/https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\/.*/,route=>route.fulfill({
   status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=','base64'),
  }));
  await context.route('https://*.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);
   const args=request.postDataJSON?.()??{};
   const reply=data=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(data)});
   if(url.pathname.includes('/auth/v1/')) {
    const user={id:uid,aud:'authenticated',role:'authenticated',email:'browser-qa@example.invalid',email_confirmed_at:now(),user_metadata:{nome:'Pessoa de teste'},app_metadata:{provider:'email',providers:['email']},created_at:now()};
    if(name==='user')return reply(user);
    if(name==='logout')return reply({});
    if(name==='token') {
     const encode=data=>Buffer.from(JSON.stringify(data)).toString('base64url');
     const expires=Math.floor(Date.now()/1000)+3600;
     const access_token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,aud:'authenticated',role:'authenticated',exp:expires,iat:Math.floor(Date.now()/1000)})+'.cWE';
     return reply({access_token,token_type:'bearer',expires_in:3600,expires_at:expires,refresh_token:'local-fixture-only',user});
    }
   }
   if(name==='versao_app')return reply(11);
   if(name==='meu_papel')return reply('usuario');
   if(name==='perfis')return request.method()==='POST'?route.fulfill({status:204,body:''}):reply({nome:'Pessoa de teste',avatar_url:null});
   if(name==='service_areas')return reply([{id:'qa',nome:'Criciúma',estado:'SC',timezone:'America/Sao_Paulo',south:-28.85,north:-28.55,west:-49.55,east:-49.2,latitude:-28.678,longitude:-49.369,latitude_delta:.02,longitude_delta:.02}]);
   if(name==='minha_participacao')return reply({avaliacoes:own?1:0,relatos:0,melhorias:0,inscricoes:0});
   if(name==='pagina_app'){
    const rows=args.p_lista==='avaliacoes'?[...savedReviews].reverse():
     args.p_lista==='eventos'&&!args.p_filtros?.passados?[event]:[];
    return reply({rows,nextCursor:null});
   }
   if(name==='mapa_lugares')return reply({places:[place],warning:'',refreshing:false});
   if(name==='mapa_relatos')return reply({total:0,nodes:[]});
   if(name==='relatos'){
    assert.equal(request.method(),'GET');
    assert.equal(url.searchParams.get('status'),'eq.verificado');
    assert.equal(url.searchParams.get('order'),'criado_em.desc,id.desc');
    assert.equal(url.searchParams.get('limit'),'3');
    return reply([]);
   }
   if(name==='resolver_lugar')return reply([place]);
   if(name==='resumos_avaliacoes'){
    const destaques=approved==='Segura'
     ? {fortes:[{fator:'iluminacao',total:1}],atencao:[]}
     : approved ? {fortes:[],atencao:[{fator:'assedio',total:1}]} : null;
    return reply({politica:policy,resumos:(args.p_lugares??[]).map(id=>({lugar_id:id,total:approved?1:0,minimo:1,janela_dias:180,classificacao:approved==='Segura'?'safe':approved==='Moderada'?'moderate':approved==='Cuidado'?'attention':'unknown',distribuicao:approved?{Segura:approved==='Segura'?1:0,Moderada:approved==='Moderada'?1:0,Cuidado:approved==='Cuidado'?1:0}:null,destaques,ultima_contribuicao:approved?now():null,propria:own?{sentimento:own,status:'pendente'}:null}))});
   }
   if(name==='fatores')return reply([{id:'iluminacao',nome:'Iluminação'}]);
   if(name==='criar_avaliacao'){
    assert.match(args.p_chave,/^[0-9a-f-]{36}$/i);
    assert.equal(args.p_lugar,placeId);
    assert.ok(savedReviews.every(review=>review.id!==args.p_chave),'a new submission gets a new ID');
    own=args.p_sentimento;
    savedReviews.push({id:args.p_chave,lugar_id:args.p_lugar,sentimento:own,comentario:args.p_comentario,status:'pendente',atualizado_em:now(),lugares:{nome:place.nome}});
    return reply(args.p_chave);
   }
   if(['notificacoes','votos','favoritos'].includes(name))return reply([]);
   unknown.push(request.method()+' '+url.pathname);
   return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unconfigured isolated fixture'})});
  });
  await page.addInitScript(() => {
   window.__cityPositions=[];
   const sample=()=>{
    const city=document.querySelector('[data-city-entrance="ready"]');
    if(city) window.__cityPositions.push(new DOMMatrixReadOnly(getComputedStyle(city).transform).m42);
    if(!window.__cityPositions.includes(0)) requestAnimationFrame(sample);
   };
   requestAnimationFrame(sample);
  });
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__cityPositions.some(y=>y>40)&&window.__cityPositions.some(y=>y>2&&y<30)&&window.__cityPositions.includes(0));
  const skyline=page.getByTestId('city-motion');
  const from=await skyline.evaluate(node=>node.getBoundingClientRect().y);
  await skyline.evaluate(node=>{
   window.__cityLayoutPositions=[];
   window.__trackCityLayout=true;
   const sample=()=>{
    if(!window.__trackCityLayout)return;
    window.__cityLayoutPositions.push(node.getBoundingClientRect().y);
    requestAnimationFrame(sample);
   };
   requestAnimationFrame(sample);
  });
  await page.getByTestId('welcome-start').click();
  await page.waitForURL('**/login');
  await page.waitForFunction(()=>document.querySelector('[data-testid="city-motion"]')?.getAnimations().length===0);
  const to=await skyline.evaluate(node=>node.getBoundingClientRect().y);
  const layoutFrames=await page.evaluate(()=>{window.__trackCityLayout=false;return window.__cityLayoutPositions;});
  assert.ok(to<from-30,'the login skyline finishes above its welcome position');
  assert.ok(layoutFrames.some(y=>y<from-20&&y>to+20),'the skyline paints intermediate positions from welcome to login');
  await page.getByTestId('auth-email').fill('browser-qa@example.invalid',{timeout:90000});
  await page.getByTestId('auth-password').fill('local-fixture-only');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByTestId('nav-events').waitFor({timeout:90000});
  assert.equal(await page.getByText('Administração',{exact:true}).count(),0,'ordinary users have no admin menu');
  const continueLoading=page.getByRole('button',{name:'Continuar no app enquanto o mapa carrega',exact:true});
  const continueIfLoading=async()=>{
   if(!await continueLoading.isVisible())return;
   try {await continueLoading.click({timeout:2500});}
   catch(error){if(error.name!=='TimeoutError'||await continueLoading.isVisible())throw error;}
  };
  await continueIfLoading();

  const idle=async()=>page.waitForFunction(()=>document.querySelector('[data-testid="tab-transition-viewport"]')?.getAttribute('aria-busy')!=='true');
  const trace=async(locator,destination,{reduced=false}={})=>{
   await idle();
   const from=new URL(page.url()).pathname;
   await page.evaluate(()=>{
    window.__elasMotion=[];window.__elasMotionActive=true;
    const sample=()=>{
     const scene=document.querySelector('[data-testid="tab-transition-scene"]'),nav=document.querySelector('[data-testid="nav-map"]');
     const style=scene?getComputedStyle(scene):null;
     window.__elasMotion.push({path:location.pathname,opacity:Number(style?.opacity??1),transform:style?.transform??'none',filter:style?.filter??'none',navFilter:nav?getComputedStyle(nav).filter:'none',browserTimeline:scene?.getAnimations().length??0});
     if(window.__elasMotionActive)requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   });
   await locator.click();await page.waitForURL('**/'+destination);await idle();
   await page.waitForFunction(()=>!document.querySelector('[data-testid="tab-transition-scene"]')?.hasAttribute('data-elas-motion'));
   await page.waitForTimeout(40);
   const samples=await page.evaluate(()=>{window.__elasMotionActive=false;return window.__elasMotion;});
   const incoming=samples.filter(row=>row.path==='/'+destination);
   if(reduced) assert.ok(samples.every(row=>row.transform==='none'),'reduced motion keeps the viewport stationary');
   else assert.ok(samples.some(row=>row.path===from&&row.opacity<0.78),'outgoing screen must visibly fade before navigation');
   assert.ok(incoming.some(row=>row.opacity<0.72),'destination must visibly fade in');
   assert.equal(samples.at(-1).opacity,1,'the destination returns to full opacity');
   assert.ok(samples.every(row=>row.navFilter==='none'),'navigation stays sharp');
   assert.ok(samples.every(row=>row.filter==='none'),'the transition never filters the whole scene');
   assert.ok(incoming.some(row=>row.browserTimeline>0&&row.opacity>0.61&&row.opacity<0.98),'the destination paints interpolated animation frames');
   return {from,to:'/'+destination,minOpacity:Math.min(...samples.map(row=>row.opacity))};
  };
  const before=await page.getByTestId('nav-events').boundingBox();
  await trace(page.getByTestId('nav-events'),'eventos');
  await page.getByRole('button',{name:'Ver detalhes: '+event.titulo,exact:true}).click();
  const eventDialog=page.getByRole('dialog',{name:'Detalhes do evento',exact:true});
  await eventDialog.waitFor();
  await page.keyboard.press('Escape');
  await eventDialog.waitFor({state:'hidden'});
  const after=await page.getByTestId('nav-events').boundingBox();assert.ok(Math.abs(before.y-after.y)<=1);
  if(process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/events-'+viewport.width+'.png'});}
  const eventButton=page.getByTestId('events-tab-events'),pollButton=page.getByTestId('events-tab-polls');
  assert.equal(await eventButton.getAttribute('aria-selected'),'true');await pollButton.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="events-tab-polls"]')?.getAttribute('aria-selected')==='true');
  const eventStyle=await eventButton.evaluate(element=>{const s=getComputedStyle(element);return {radius:s.borderRadius,padding:s.padding,minHeight:s.minHeight};});
  await trace(page.getByTestId('nav-reports'),'alertas');
  const reportsStyle=await page.getByRole('button',{name:'Meus relatos',exact:true}).evaluate(element=>{const s=getComputedStyle(element);return {radius:s.borderRadius,padding:s.padding,minHeight:s.minHeight};});
  assert.deepEqual(eventStyle,reportsStyle,'Events/Polls use the exact shared report button geometry');
  if(process.env.QA_TAB_SCREENSHOTS){await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/reports-'+viewport.width+'.png'});}
  const requestedTransition=await trace(page.getByTestId('nav-map'),'mapa');
  await continueIfLoading();
  await trace(page.getByTestId('nav-profile'),'perfil');
  await page.getByRole('button',{name:'Participar: avaliar um lugar ou relatar uma situação',exact:true}).click();
  await page.getByRole('button',{name:'Avaliar um lugar',exact:true}).waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="tab-transition-scene"]')).opacity)<0.9);
  await page.getByRole('button',{name:'Fechar Como você quer participar?',exact:true}).click();await idle();
  const profileChecks=[];
  for(const [label,destination] of [['Informações pessoais','informacoes-pessoais'],['Configurações','configuracoes'],['Minhas avaliações','minhas-avaliacoes'],['Meus favoritos','favoritos'],['Meus relatos','meus-relatos'],['Minhas solicitações','minhas-solicitacoes'],['Notificações','notificacoes'],['Ver todas as conquistas','conquistas'],['Alterar foto do perfil','foto-perfil']]){
   await trace(page.getByRole('button',{name:label,exact:true}),destination);
   const back=destination==='conquistas'?page.getByTestId('nav-profile'):page.getByRole('button',{name:/^Voltar( ao perfil)?$/});
   await trace(back,'perfil');profileChecks.push(destination);
  }
  await page.getByTestId('nav-events').dispatchEvent('click');await page.getByTestId('nav-reports').dispatchEvent('click');
  await page.waitForURL('**/alertas');await idle();
  await page.emulateMedia({reducedMotion:'reduce'});
  await trace(page.getByTestId('nav-events'),'eventos',{reduced:true});

  // Selected place classification is hydrated through the real services/parser.
  await page.goto(base+'/mapa?placeId='+placeId,{waitUntil:'domcontentloaded'});
  await page.getByText('Sem avaliações suficientes',{exact:true}).first().waitFor({timeout:60000});
  await page.goto(base+'/avaliar?placeId='+placeId,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Segura',exact:true}).click({timeout:60000});
  await page.getByRole('checkbox',{name:'Iluminação',exact:true}).click();
  await page.getByPlaceholder('Escreva algo sobre sua experiência...').fill('Minha primeira visita');
  await page.getByRole('button',{name:'Avaliar lugar',exact:true}).click();
  await page.getByText('Avaliação concluída!',{exact:true}).waitFor();assert.equal(savedReviews.length,1);
  await page.goto(base+'/mapa?placeId='+placeId,{waitUntil:'domcontentloaded'});
  await page.getByText('Seguro · sua avaliação',{exact:true}).waitFor({timeout:60000});
  await page.goto(base+'/avaliar?placeId='+placeId,{waitUntil:'domcontentloaded'});
  const nextComment=page.getByPlaceholder('Escreva algo sobre sua experiência...');
  await nextComment.waitFor({timeout:60000});
  await page.getByRole('button',{name:'Moderada',exact:true}).click();
  assert.equal(await nextComment.inputValue(),'','a new review does not preload the previous comment');
  await page.getByRole('checkbox',{name:'Iluminação',exact:true}).click();
  await nextComment.fill('Minha segunda visita');
  await page.getByRole('button',{name:'Avaliar lugar',exact:true}).click();
  await page.getByText('Avaliação concluída!',{exact:true}).waitFor();
  assert.deepEqual(savedReviews.map(row=>row.comentario),['Minha primeira visita','Minha segunda visita']);
  await page.goto(base+'/minhas-avaliacoes',{waitUntil:'domcontentloaded'});
  await page.getByText('Minha primeira visita',{exact:true}).waitFor({timeout:60000});
  await page.getByText('Minha segunda visita',{exact:true}).waitFor();
  assert.equal(await page.getByText('Editar avaliação',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Ver histórico da avaliação',exact:true}).count(),2);
  await page.goto(base+'/mapa?placeId='+placeId,{waitUntil:'domcontentloaded'});
  for(const [mood,label] of [['Segura','Seguro'],['Moderada','Moderado'],['Cuidado','Cuidado']]) {
   approved=mood;await page.reload({waitUntil:'domcontentloaded'});
   await page.getByText(label,{exact:true}).first().waitFor({timeout:60000});
   const expand=page.getByRole('button',{name:'Ver detalhes de '+place.nome,exact:true});
   if(await expand.isVisible())await expand.click();
   const factor=page.getByText(mood==='Segura'?'Boa iluminação':'Assédio ou importunação',{exact:true});
   await factor.waitFor();
   const bounds=await factor.boundingBox();
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1,'factor rows fit a small phone viewport');
   assert.equal(await page.getByText('Minha primeira visita',{exact:true}).count(),0,'the public map only shows aggregates');
  }
  assert.equal(await page.getByTestId('recent-review-examples').count(),0,'sample comments do not appear on the map');
  await continueLoading.waitFor({state:'hidden',timeout:15000});
  assert.equal(await page.getByText('exemplo fictício',{exact:false}).count(),0);
  assert.deepEqual(unknown,[],'every backend interaction has an explicit local fixture');
  assert.deepEqual(errors,[],'real UI has no browser runtime exceptions');
  if(process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/place-'+viewport.width+'.png'});}
  await page.getByTestId('nav-profile').click();await page.waitForURL('**/perfil');await idle();
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByTestId('welcome-how-it-works').waitFor({timeout:15000});
  assert.equal(await page.getByText('PASSO 1 DE 4',{exact:false}).count(),0,'logout restores the new welcome, not an unsolicited tour');
  assert.deepEqual(unknown,[]);assert.deepEqual(errors,[]);
  checks.push({viewport,sceneTransition:true,stableNavigation:true,rapidTabs:true,reducedMotion:true,profileOptions:profileChecks,requestedTransition,sharedReportButtons:true,reviewSubmission:true,classifications:['Seguro','Moderado','Cuidado'],factorHighlights:true,logoutToWelcome:true,runtimeErrors:errors.length});
  await context.close();
 }
 console.log(JSON.stringify({test:'Expo web UI with isolated API fixtures; no live writes',checks}));
 if(process.env.QA_TAB_OUTPUT)await writeFile(process.env.QA_TAB_OUTPUT,JSON.stringify(checks,null,2));
} catch(error) {
 console.error(JSON.stringify({url:debugPage?.url(),unknown:debugUnknown,body:await debugPage?.locator('body').innerText().catch(()=>''),message:error.message}));
 if(debugPage&&process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await debugPage.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/failure.png'}).catch(()=>{});}
 throw error;
} finally {await browser.close();}
