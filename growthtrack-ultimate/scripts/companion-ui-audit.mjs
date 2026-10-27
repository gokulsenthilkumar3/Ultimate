import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { createRequire } from 'node:module';
const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const require=createRequire(`${root}/growthtrack-ultimate/package.json`);
const {chromium}=require('@playwright/test');
const output=`${root}/growthtrack-ultimate/docs/redesign-research/2026-10-27/implementation`;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const plan=JSON.parse(await fs.readFile(`${root}/growthtrack-ultimate/docs/redesign-research/2026-10-27/research-plan.json`,'utf8'));
const phase=process.argv.includes('--after')?'after':'before';
const user={id:'isolated-family-owner',name:'Alex Fixture',email:'alex@example.test',createdAt:'2026-10-01T00:00:00Z'};
const tree={id:'fixture-tree',name:'Fixture family',ownerId:user.id,rootMemberId:'fixture-member',isPublic:false,createdAt:user.createdAt,updatedAt:user.createdAt};
const member={id:'fixture-member',treeId:tree.id,name:'Alex Fixture',gender:'other',birthDate:'1990-01-10',createdAt:user.createdAt,updatedAt:user.createdAt};
const modes={finsync:{port:5571,paths:['/dashboard','/dashboard/transactions','/dashboard/analytics','/dashboard/budget','/dashboard/investments','/dashboard/wallets','/dashboard/bills','/dashboard/cards','/dashboard/profile','/dashboard/settings']},oxfin:{port:5572,paths:['/dashboard','/wallets','/investments','/cards','/bills','/transactions','/settings','/auth/error','/auth/ultimate/callback']},family:{port:5104,paths:['/dashboard','/tree','/timeline','/media','/members','/events','/profile/fixture-member','/settings']}};
Object.assign(modes,{equity:{port:5105,paths:[]},forex:{port:8501,paths:['/']}});
for(const [id,name] of Object.entries({finsync:'FinSync',oxfin:'OxFin',family:'Family Connect',equity:'Equity Lens'}))modes[id].paths=plan.companionPages.filter(page=>page.product===name).map(page=>page.path.replace(':id','fixture-member'));
const only=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
const report=[];
for(const [product,mode] of Object.entries(modes)){
 if(only&&only!==product)continue;
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
 const page=await context.newPage();let errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&!/net::ERR_NETWORK_ACCESS_DENIED/.test(message.text()))errors.push(message.text().slice(0,300));});
 await page.route(/https:\/\/(fonts\.(googleapis|gstatic)\.com)/,route=>route.fulfill({body:'',contentType:'text/css'}));
 await page.addInitScript(()=>localStorage.setItem('familyconnect_token','isolated-ui-token'));
 await page.route(url=>url.pathname.startsWith('/api/'),async route=>{
  const p=new URL(route.request().url()).pathname;let json={};
  if(route.request().method()!=='GET')return route.fulfill({status:403,json:{error:'Read-only isolated UI fixture'}});
  if(p.endsWith('/user/balance'))json={balance:85000,currency:'INR',wallets:[]};
  else if(p.endsWith('/user/transactions'))json={transactions:[]};
  else if(p.endsWith('/user/security-status'))json={twoFactorEnabled:false};
  else if(p.endsWith('/trees'))json=[tree];
  else if(p.endsWith('/trees/fixture-tree'))json={...tree,members:[member],relationships:[],currentUserRole:'viewer'};
  else if(p.endsWith('/members/fixture-member'))json=member;
  else if(/events|documents|notifications|activity/.test(p))json=[];
  else if(/\/auth\/me|\/users\/me/.test(p))json=user;
  return route.fulfill({json,headers:{'access-control-allow-origin':'*'}});
 });
 for(const viewport of (process.argv.includes('--matrix')?[{width:1280,height:720},{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]:[{width:1366,height:768}])){
 await page.setViewportSize(viewport);
 for(const route of mode.paths){errors=[];let failure='';try{
  await page.goto(`http://127.0.0.1:${mode.port}${['family','equity','forex'].includes(product)?'/Ultimate/products/'+product:''}${route}`,{waitUntil:'networkidle',timeout:45000});
  if(product==='forex')await page.getByRole('heading',{name:/Forex/}).waitFor({timeout:60000});
  await page.waitForTimeout(300);
  const metrics=await page.evaluate(()=>({title:document.querySelector('h1,h2')?.textContent,body:document.body.innerText.slice(0,160),overflow:document.documentElement.scrollWidth-innerWidth,controls:document.querySelectorAll('button,input,select').length}));
  if(!metrics.controls && !metrics.title && metrics.body.length<20) throw new Error('The page did not render its UI.');
  await page.screenshot({path:`${output}/${product}-${route.replaceAll('/','_')||'root'}-${phase}-${viewport.width}.png`});
  report.push({product,route,viewport,landedURL:page.url(),...metrics,errors:[...errors]});
 }catch(error){failure=String(error).slice(0,350);report.push({product,route,viewport,failure,errors:[...errors]});}
 console.log(JSON.stringify(report.at(-1)));
 }
 }
 await context.close();
}
await fs.writeFile(`${output}/companion-fixture-${phase}${only?'-'+only:''}${process.argv.includes('--matrix')?'-matrix':''}.json`,JSON.stringify(report,null,2));
await browser.close();
