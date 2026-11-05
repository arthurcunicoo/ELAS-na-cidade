import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Run the actual Expo app. Every Supabase request is intercepted: synthetic
// credentials/reviews never leave this isolated browser or reach the live DB.
const browser = await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER_EXECUTABLE,args:['--no-sandbox']});
const base = process.env.QA_WELCOME_URL??'http://localhost:8086', checks=[];
const uid='11111111-1111-4111-8111-111111111111', placeId='qa-place';
const place={id:placeId,nome:'Praça de teste',endereco:'Centro',latitude:-28.678,longitude:-49.369,categoria:'park',categoria_app:'parks',relevancia:100};
const policy={versao:2,metodo:'Percepções comunitárias aprovadas; mínimo de uma avaliação.'};
const now=()=>new Date().toISOString();
const reviewFixtures=JSON.parse(readFileSync(new URL('../supabase/avaliacoes-apresentacao.json',import.meta.url),'utf8'));
const examplesEnabled=process.env.EXPO_PUBLIC_APP_ENV==='presentation'&&process.env.EXPO_PUBLIC_REVIEW_EXAMPLES==='1';
const contentEnabled=process.env.EXPO_PUBLIC_APP_ENV==='presentation'&&process.env.EXPO_PUBLIC_SHOWCASE==='1';
const seed=readFileSync(new URL('../supabase/DEMONSTRACAO.sql',import.meta.url),'utf8');
const demoFixtures=JSON.parse(seed.split('$elas_demo$')[1]).map(row=>({...row,ativo:true,ficticio:true,
 inicia_em:row.dias===null?null:new Date(Date.now()+row.dias*86400000).toISOString(),
 criado_em:new Date(Date.now()-(row.horas_atras??0)*3600000).toISOString()}));
const fixturePlaces=new Map([[placeId,place],...reviewFixtures.map(row=>[row.lugar_id,{...place,id:row.lugar_id,nome:row.local_texto}])]);
let debugPage,debugUnknown;
try {
 for (const viewport of [{width:357,height:706},{width:320,height:568}].filter(viewport=>!process.env.QA_TAB_WIDTH||viewport.width===Number(process.env.QA_TAB_WIDTH))) {
  const context=await browser.newContext({viewport,reducedMotion:'no-preference'}), page=await context.newPage(), errors=[], unknown=[];
  page.setDefaultNavigationTimeout(90000);
  let own=null,approved=null,saves=0,catalogPlace=place;
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
   if(name==='pagina_app')return reply({rows:[],nextCursor:null});
   if(name==='mapa_lugares')return reply({places:[catalogPlace],warning:'',refreshing:false});
   if(name==='mapa_relatos')return reply({total:0,nodes:[]});
   if(name==='resolver_lugar')return reply([fixturePlaces.get(args.p_id)??place]);
   if(name==='conteudos_demonstracao'){
    const type=url.searchParams.get('tipo')?.slice(3);
    if(type!=='avaliacao'){
     assert.equal(contentEnabled,true,'events and reports require presentation mode');
     assert.equal(url.searchParams.get('ativo'),'eq.true');
     assert.equal(url.searchParams.get('ficticio'),'eq.true');
     return reply(demoFixtures.filter(row=>row.tipo===type));
    }
    assert.equal(examplesEnabled,true,'normal builds must not request presentation reviews');
    assert.equal(url.searchParams.get('ficticio'),'eq.true');
    assert.equal(url.searchParams.get('id'),'like.demo:apresentacao-avaliacao:%');
    const placeId=url.searchParams.get('lugar_id')?.slice(3);
    return reply(reviewFixtures.filter(row=>row.lugar_id===placeId).map(row=>({...row,tipo:'avaliacao',ativo:true,ficticio:true,criado_em:now()})));
   }
   if(name==='resumos_avaliacoes')return reply({politica:policy,resumos:(args.p_lugares??[]).map(id=>({lugar_id:id,total:approved?1:0,minimo:1,janela_dias:180,classificacao:approved==='Segura'?'safe':approved==='Moderada'?'moderate':approved==='Cuidado'?'attention':'unknown',distribuicao:approved?{Segura:approved==='Segura'?1:0,Moderada:approved==='Moderada'?1:0,Cuidado:approved==='Cuidado'?1:0}:null,ultima_contribuicao:approved?now():null,propria:own?{sentimento:own,status:'pendente'}:null}))});
   if(name==='fatores')return reply([{id:'iluminacao',nome:'Iluminação'}]);
   if(name==='avaliacoes')return reply(own?{sentimento:own,comentario:'',avaliacao_fatores:[{fator_id:'iluminacao'}]}:null);
   if(name==='salvar_avaliacao'){own=args.p_sentimento;saves++;return reply('22222222-2222-4222-8222-222222222222');}
   if(['notificacoes','votos','favoritos'].includes(name))return reply([]);
   unknown.push(request.method()+' '+url.pathname);
   return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unconfigured isolated fixture'})});
  });
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
  await page.getByTestId('auth-email').fill('browser-qa@example.invalid',{timeout:90000});
  await page.getByTestId('auth-password').fill('local-fixture-only');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByTestId('nav-events').waitFor({timeout:90000});
  assert.equal(await page.getByText('Administração',{exact:true}).count(),0,'ordinary users have no admin menu');
  const continueLoading=page.getByRole('button',{name:'Continuar no app enquanto o mapa carrega',exact:true});
  const mapReady=()=>continueLoading.waitFor({state:'hidden',timeout:15000});
  await mapReady();

  const idle=async()=>page.waitForFunction(()=>document.querySelector('[data-testid="tab-transition-viewport"]')?.getAttribute('aria-busy')!=='true');
  const trace=async(locator,destination)=>{
   await idle();
   const from=new URL(page.url()).pathname;
   await page.evaluate(()=>{
    window.__elasMotion=[];window.__elasMotionActive=true;
    const sample=()=>{
     const scene=document.querySelector('[data-testid="tab-transition-scene"]'),nav=document.querySelector('[data-testid="nav-map"]');
     const filter=scene?getComputedStyle(scene).filter:'none';
     window.__elasMotion.push({path:location.pathname,blur:Number(filter.match(/blur\(([-\d.]+)px\)/)?.[1]??0),navFilter:nav?getComputedStyle(nav).filter:'none'});
     if(window.__elasMotionActive)requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   });
   await locator.click();await page.waitForURL('**/'+destination);await idle();
   await page.waitForFunction(()=>{const filter=getComputedStyle(document.querySelector('[data-testid="tab-transition-scene"]')).filter;return Number(filter.match(/blur\(([-\d.]+)px\)/)?.[1]??0)<0.2;});
   await page.waitForTimeout(40);
   const samples=await page.evaluate(()=>{window.__elasMotionActive=false;return window.__elasMotion;});
   assert.ok(samples.some(row=>row.path===from&&row.blur>3),'outgoing screen must visibly defocus before navigation');
   assert.ok(samples.some(row=>row.path==='/'+destination&&row.blur>3),'destination must initially arrive blurred');
   assert.ok(samples.at(-1).blur<0.2,'the destination returns to full focus');
   assert.ok(samples.every(row=>row.navFilter==='none'),'navigation stays sharp');
   return {from,to:'/'+destination,maxBlur:Math.max(...samples.map(row=>row.blur))};
  };
  const before=await page.getByTestId('nav-events').boundingBox();
  await trace(page.getByTestId('nav-events'),'eventos');
  const after=await page.getByTestId('nav-events').boundingBox();assert.ok(Math.abs(before.y-after.y)<=1);
  if(contentEnabled){
   const event=demoFixtures.find(row=>row.tipo==='evento');
   await page.getByRole('button',{name:'Ver exemplo: '+event.titulo,exact:true}).click();
   await page.getByText('não há inscrição ou encontro confirmado.',{exact:false}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Quero participar',exact:true}).count(),0);
   await page.getByRole('button',{name:'Fechar exemplo',exact:true}).click();
  }
  if(process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/events-'+viewport.width+'.png'});}
  const eventButton=page.getByTestId('events-tab-events'),pollButton=page.getByTestId('events-tab-polls');
  assert.equal(await eventButton.getAttribute('aria-selected'),'true');await pollButton.click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="events-tab-polls"]')?.getAttribute('aria-selected')==='true');
  const eventStyle=await eventButton.evaluate(element=>{const s=getComputedStyle(element);return {radius:s.borderRadius,padding:s.padding,minHeight:s.minHeight};});
  await trace(page.getByTestId('nav-reports'),'alertas');
  if(contentEnabled){
   await page.getByText('Relatos de demonstração',{exact:true}).waitFor();
   await page.getByText('Não são ocorrências verificadas nem alertas reais.',{exact:false}).waitFor();
   assert.ok(await page.getByText('Exemplo fictício',{exact:false}).count()>0);
  }
  const reportsStyle=await page.getByRole('button',{name:'Meus relatos',exact:true}).evaluate(element=>{const s=getComputedStyle(element);return {radius:s.borderRadius,padding:s.padding,minHeight:s.minHeight};});
  assert.deepEqual(eventStyle,reportsStyle,'Events/Polls use the exact shared report button geometry');
  if(process.env.QA_TAB_SCREENSHOTS){await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/reports-'+viewport.width+'.png'});}
  const requestedTransition=await trace(page.getByTestId('nav-map'),'mapa');
  await mapReady();
  await trace(page.getByTestId('nav-profile'),'perfil');
  await page.getByRole('button',{name:'Participar: avaliar um lugar ou relatar uma situação',exact:true}).click();
  await page.getByRole('button',{name:'Avaliar um lugar',exact:true}).waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-testid="tab-transition-scene"]')).filter.match(/blur\(([-\d.]+)px\)/)?.[1]??0)>10);
  await page.getByRole('button',{name:'Fechar Como você quer participar?',exact:true}).click();await idle();
  const profileChecks=[];
  for(const [label,destination] of [['Informações pessoais','informacoes-pessoais'],['Configurações','configuracoes'],['Minhas avaliações','minhas-avaliacoes'],['Meus favoritos','favoritos'],['Meus relatos','meus-relatos'],['Minhas solicitações','minhas-solicitacoes'],['Notificações','notificacoes'],['Ver todas as conquistas','conquistas'],['Alterar foto do perfil','foto-perfil']]){
   await trace(page.getByRole('button',{name:label,exact:true}),destination);
   const back=destination==='conquistas'?page.getByTestId('nav-profile'):page.getByRole('button',{name:/^Voltar( ao perfil)?$/});
   await trace(back,'perfil');profileChecks.push(destination);
  }
  await page.getByTestId('nav-events').dispatchEvent('click');await page.getByTestId('nav-reports').dispatchEvent('click');
  await page.waitForURL('**/alertas');await idle();
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByTestId('nav-events').click();await page.waitForURL('**/eventos');await idle();
  const reducedFilter=await page.getByTestId('tab-transition-scene').evaluate(element=>getComputedStyle(element).filter);
  assert.ok(reducedFilter==='none'||reducedFilter==='blur(0px)');

  // Start at the map without a selected place, then actually click its marker.
  const selectMarker=async (id,approvedCount=0)=>{
   catalogPlace=fixturePlaces.get(id);
   const name=catalogPlace.nome;
   await page.goto(base+'/mapa',{waitUntil:'domcontentloaded'});
   const marker=page.getByRole('button',{name:`Ver detalhes de ${name}. ${approvedCount} avaliações aprovadas`,exact:true});
   await marker.waitFor({timeout:60000});
   await mapReady();
   const details=page.getByRole('button',{name:'Ver detalhes de '+name,exact:true});
   assert.equal(await details.count(),0,'the place card starts closed');
   await marker.click({timeout:15000});
   await page.waitForURL(url=>url.searchParams.get('placeId')===id,{timeout:10000});
   await details.waitFor();
   return details;
  };
  const unrated=await selectMarker(placeId);
  await unrated.getByText('Sem avaliações suficientes',{exact:true}).waitFor();
  await page.goto(base+'/avaliar?placeId='+placeId,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Segura',exact:true}).click({timeout:60000});
  await page.getByRole('checkbox',{name:'Iluminação',exact:true}).click();
  await page.getByRole('button',{name:'Avaliar lugar',exact:true}).click();
  await page.getByText('Avaliação concluída!',{exact:true}).waitFor();assert.equal(saves,1);
  await page.goto(base+'/mapa?placeId='+placeId,{waitUntil:'domcontentloaded'});
  await page.getByText('Seguro · sua avaliação',{exact:true}).waitFor({timeout:60000});
  for(const [mood,label] of [['Segura','Seguro'],['Moderada','Moderado'],['Cuidado','Cuidado']]) {
   approved=mood;
   const details=await selectMarker(placeId,1);
   await details.getByText(label,{exact:true}).waitFor();
  }
  const examplePlaces=[];
  if(examplesEnabled){
   own=null;approved=null;
   for(const [id,label] of [['nereu','Seguro'],['congresso','Moderado'],['osm:way:453621835','Cuidado'],['osm:node:9478440538','Seguro'],['overture:52e7790c-14ed-4ddb-9e02-82ff0e8985f8','Moderado']]){
    const expand=await selectMarker(id);
    await expand.getByText(label+' · apresentação',{exact:true}).waitFor();
    const name=fixturePlaces.get(id).nome;
    await expand.click();
    const section=page.getByTestId('recent-review-examples');await section.waitFor();
    const visibleTitle=page.getByRole('button',{name:'Recolher detalhes de '+name,exact:true}).getByText(name,{exact:true});
    assert.ok(await visibleTitle.evaluate(element=>{
     const box=element.getBoundingClientRect();
     return element.contains(document.elementFromPoint(box.left+box.width/2,box.top+box.height/2));
    }),'expanded place title must not be covered by the map filters');
    const text=await section.innerText();
    assert.ok(text.includes('nomes e comentários fictícios'));
    for(const row of reviewFixtures.filter(row=>row.lugar_id===id))assert.ok(text.includes(row.nome_exibicao)&&text.includes(row.descricao));
    const bounds=await section.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1,'review cards fit a small phone viewport');
    examplePlaces.push({id,classification:label,reviews:4,openedByMarker:true,explicitLabels:true});
    if(process.env.QA_TAB_SCREENSHOTS&&id==='nereu')await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/review-examples-'+viewport.width+'.png'});
   }
   // Real approved perceptions retain priority over presentation status.
   approved='Segura';await page.goto(base+'/mapa?placeId=congresso',{waitUntil:'domcontentloaded'});
   const header=page.getByRole('button',{name:/^(Ver|Recolher) detalhes de Praça do Congresso$/});
   await header.getByText('Seguro',{exact:true}).waitFor({timeout:60000});
   assert.equal(await page.getByText('Moderado · apresentação',{exact:true}).count(),0);
  }else{
   assert.equal(await page.getByTestId('recent-review-examples').count(),0,'normal app never inserts sample review cards');
  }
  await continueLoading.waitFor({state:'hidden',timeout:15000});
  assert.equal(await page.getByText('exemplo fictício',{exact:false}).count(),0);
  assert.deepEqual(unknown,[],'every backend interaction has an explicit local fixture');
  assert.deepEqual(errors,[],'real UI has no browser runtime exceptions');
  if(process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await page.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/place-'+viewport.width+'.png'});}
  await page.getByTestId('nav-profile').click();await page.waitForURL('**/perfil');await idle();
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByRole('button',{name:'Sair',exact:true}).last().click();
  await page.getByTestId('welcome-how-it-works').waitFor({timeout:15000});
  assert.equal(await page.getByText('PASSO 1 DE 4',{exact:false}).count(),0,'logout restores the new welcome, not an unsolicited tour');
  assert.deepEqual(unknown,[]);assert.deepEqual(errors,[]);
  checks.push({viewport,blur:true,stableNavigation:true,rapidTabs:true,reducedMotion:true,profileOptions:profileChecks,requestedTransition,sharedReportButtons:true,reviewSubmission:true,markerSelection:true,classifications:['Seguro','Moderado','Cuidado'],examplePlaces,presentationEvents:contentEnabled,presentationReports:contentEnabled,realRatingsTakePriority:true,logoutToWelcome:true,runtimeErrors:errors.length});
  await context.close();
 }
 console.log(JSON.stringify({test:'Expo web UI with isolated API fixtures; no live writes',checks}));
 if(process.env.QA_TAB_OUTPUT)await writeFile(process.env.QA_TAB_OUTPUT,JSON.stringify(checks,null,2));
} catch(error) {
 console.error(JSON.stringify({url:debugPage?.url(),unknown:debugUnknown,body:await debugPage?.locator('body').innerText().catch(()=>''),message:error.message}));
 if(debugPage&&process.env.QA_TAB_SCREENSHOTS){await mkdir(process.env.QA_TAB_SCREENSHOTS,{recursive:true});await debugPage.screenshot({path:process.env.QA_TAB_SCREENSHOTS+'/failure.png'}).catch(()=>{});}
 throw error;
} finally {await browser.close();}
