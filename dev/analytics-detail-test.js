// Deterministic browser contracts for aggregate analytics. Every network request is
// fulfilled locally or aborted. The optional real-vendor check uses an already
// downloaded official script; it never contacts the collector.
// Run: node dev/analytics-detail-test.js
// Optional: PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium GOATCOUNTER_SCRIPT_PATH=/path/to/count.js node dev/analytics-detail-test.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../shared/js/analytics.js'), 'utf8');
const origin = 'https://abidaziz1.github.io';
const base = origin + '/data-engineering-prep/';
const epoch = 1800000000000;
let assertions = 0;
const results = [];
function check(value, label) { assert(value, label); assertions++; }
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions++; }
const STUB = `window.__hits=[]; window.goatcounter={
  get_data:function(o){o=o||{};return {p:o.path,t:o.title,e:!!o.event,q:location.search,r:o.referrer===undefined?document.referrer:o.referrer,s:1440,b:0};},
  count:function(o){window.__hits.push(this.get_data(o));}
};`;
function fixture(url) {
  const u = new URL(url), m = /\/([a-z-]+)\/index\.html$/.exec(u.pathname);
  const course = m && m[1] !== 'data-engineering-prep' ? m[1] : null;
  const conf = course ? { id: course, tracks: [{id:'junior',level:1},{id:'senior',level:2},{id:'all',level:3}] } : null;
  return '<!doctype html><html><head><title>Data Engineering Prep</title></head><body>' +
    '<main><a class="card ready" id="course-link" href="aws/index.html">AWS</a>' +
    '<a class="card ready" id="external-link" href="https://example.net/aws/index.html">External</a>' +
    '<a class="card ready" id="unlisted-link" href="private-person/index.html">Unknown</a>' +
    '<a class="card ready" id="query-link" href="aws/index.html?email=person@example.com">Query</a></main><footer>Independent study.</footer>' +
    '<script>window.LAB={config:' + JSON.stringify(conf) + ',app:{state:{chosen:true,track:"senior",ans:{secret:"PRIVATE_ANSWER"},grades:{score:81}}}};</script>' +
    '<script>' + source.replace(/<\/script/gi, '<\\/script') + '</script></body></html>';
}
(async () => {
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {});
  const contexts = [];
  async function setup(options={}) {
    const ctx = await browser.newContext(); contexts.push(ctx);
    let vendorRelease, requestedVendor = 0;
    const collector = [];
    const errors = [];
    await ctx.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url.startsWith('https://gc.zgo.at/count.js')) {
        requestedVendor++;
        if (options.delayVendor) await new Promise(resolve => { vendorRelease = resolve; });
        if (options.loadError) return route.abort();
        return route.fulfill({status:200,contentType:'application/javascript',body:options.vendor || STUB});
      }
      if (/https:\/\/[^/]*goatcounter\.com\/count/.test(url)) {
        collector.push({url,method:req.method(),body:req.postData()});
        return route.abort();
      }
      if (url.startsWith(base)) return route.fulfill({status:200,contentType:'text/html',body:fixture(url)});
      return route.abort();
    });
    const page = await ctx.newPage();
    page.on('pageerror', err => errors.push(err.message));
    await page.addInitScript(o => {
      window.__clock = o.clock || 1800000000000;
      window.__intervals = [];
      window.setInterval = function(fn, ms) { window.__intervals.push({fn,ms,on:true}); return window.__intervals.length; };
      window.clearInterval = function(id) { if(window.__intervals[id-1])window.__intervals[id-1].on=false; };
      window.__visible = true; window.__focused = true;
      Object.defineProperty(document,'visibilityState',{get:()=>window.__visible?'visible':'hidden'});
      document.hasFocus=()=>window.__focused;
      window.LAB_ANALYTICS = Object.assign({code:'test-site',force:true},o.cfg || {});
      window.LAB_ANALYTICS.now=()=>window.__clock;
      if(o.dnt)Object.defineProperty(navigator,'doNotTrack',{get:()=>o.dnt});
      if(o.gpc)Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
      if(o.storedOptout)localStorage.setItem('dep.notrack','1');
      if(o.session)sessionStorage.setItem('dep.analytics.v2',JSON.stringify(o.session));
      if(o.blockStorage) {
        Storage.prototype.getItem=function(){throw new Error('storage blocked');};
        Storage.prototype.setItem=function(){throw new Error('storage blocked');};
        Storage.prototype.removeItem=function(){throw new Error('storage blocked');};
      }
    }, options);
    const url = options.url || base + 'aws/index.html';
    await page.goto(url,{waitUntil:options.delayVendor?'domcontentloaded':'load'});
    await page.waitForFunction(()=>window.LAB && LAB.analytics);
    if (!options.delayVendor) await page.waitForTimeout(25);
    const C={ctx,page,errors,collector,vendorRequests:()=>requestedVendor,release:()=>vendorRelease && vendorRelease()};
    C.hits=()=>page.evaluate(()=>window.__hits||[]);
    C.paths=async()=> (await C.hits()).filter(h=>h.e).map(h=>h.p);
    C.call=(method,...args)=>page.evaluate(({method,args})=>LAB.analytics[method].apply(LAB.analytics,args),{method,args});
    C.time=async(ms,activity=false)=>page.evaluate(({ms,activity})=>{
      const chunk=5000;
      for(let elapsed=0;elapsed<ms;elapsed+=chunk){
        window.__clock+=Math.min(chunk,ms-elapsed);
        if(activity)document.dispatchEvent(new Event('pointerdown'));
        window.__intervals.filter(t=>t.on&&t.ms===5000).forEach(t=>t.fn());
      }
    },{ms,activity});
    return C;
  }
  async function test(name, run) {
    const before=assertions;
    try {await run(); results.push({name,assertions:assertions-before,passed:true}); console.log('PASS '+name);}
    finally {for(const ctx of contexts.splice(0))await ctx.close();}
  }
  function count(paths,p){return paths.filter(x=>x===p).length;}
  try {
    await test('traffic, path and mission reach deduplicate across reload and course navigation',async()=>{
      const C=await setup();
      await C.call('frame',{n:1,title:'Storage'},{type:'talk'},{index:25,total:100,missionIndex:1,missionTotal:10});
      await C.call('frame',{n:1,title:'Storage'},{type:'talk'},{index:25,total:100,missionIndex:1,missionTotal:10});
      let p=await C.paths();
      equal(count(p,'aws/path-senior'),1,'one path event');
      equal(count(p,'aws/mission-01'),1,'one mission event');
      equal(count(p,'aws/course-opened'),1,'one open reach event');
      equal(count(p,'aws/progress-25'),1,'25% navigation threshold emitted once');
      check(p.includes('aws/track-senior/mission-01'),'path-specific mission reach');
      check(!p.some(x=>/complete|passed|score/.test(x)),'no verified learning completion or score claim');
      await C.page.reload(); await C.page.waitForTimeout(25);
      await C.call('frame',{n:1,title:'Storage'},{type:'talk'},{index:25,total:100,missionIndex:1,missionTotal:10});
      p=await C.paths();
      equal(p.length,0,'reload adds no duplicate aggregate session events');
      equal((await C.hits()).filter(h=>!h.e).length,1,'reload remains a genuine document page view');
      await C.page.goto(base+'azure/index.html'); await C.page.waitForTimeout(25);
      check((await C.paths()).includes('azure/course-opened'),'another course has its own event scope');
      await C.page.goto(base+'aws/index.html'); await C.page.waitForTimeout(25);
      equal((await C.paths()).length,0,'returning to course in tab preserves dedupe');
      check(C.errors.length===0,'navigation produces no browser errors');
    });
    await test('session expiry and clock rollback recover without a permanent identifier',async()=>{
      const C=await setup();
      await C.call('interaction','lab');
      await C.time(30*60*1000+5000);
      await C.call('interaction','lab');
      equal(count(await C.paths(),'aws/interaction-lab'),2,'30-minute inactivity starts a new event reach session');
      await C.page.evaluate(()=>window.__clock-=60*60*1000);
      await C.call('interaction','lab');
      equal(count(await C.paths(),'aws/interaction-lab'),3,'backward clock resets safely');
      const state=await C.page.evaluate(()=>JSON.parse(sessionStorage.getItem('dep.analytics.v2')));
      equal(Object.keys(state).sort(),['engaged','last','sent','v'],'session stores only event flags, numeric time and schema');
      check(!JSON.stringify(state).includes('PRIVATE_ANSWER'),'saved learning answers never enter analytics session');
    });
    await test('active time excludes hidden, unfocused and idle periods',async()=>{
      const C=await setup();
      await C.time(15000,true);
      check((await C.paths()).includes('aws/active-15s'),'active 15 seconds counted');
      check(!(await C.paths()).includes('aws/active-60s'),'short visit does not reach 60 seconds');
      await C.page.evaluate(()=>{window.__visible=false;document.dispatchEvent(new Event('visibilitychange'));});
      await C.time(120000,true);
      check(!(await C.paths()).includes('aws/active-60s'),'hidden user activity does not count as active viewing');
      await C.page.evaluate(()=>{window.__visible=true;window.__focused=false;});
      await C.time(120000,true);
      check(!(await C.paths()).includes('aws/active-60s'),'unfocused time not counted');
      await C.page.evaluate(()=>{window.__focused=true;window.dispatchEvent(new Event('focus'));});
      await C.time(45000,true);
      equal(count(await C.paths(),'aws/active-60s'),1,'visible focused cumulative time reaches 60 seconds once');
      await C.time(10*60*1000,false);
      check(!(await C.paths()).includes('aws/active-300s'),'idle tab does not accumulate 5-minute engagement');
      await C.time(5*60*1000,true);
      equal(count(await C.paths(),'aws/active-300s'),1,'active return reaches threshold once');
    });
    await test('progress and end events state navigation semantics and validate public categories',async()=>{
      const C=await setup();
      await C.call('frame',{n:2,title:'Storage'},{type:'quiz'},{index:99,total:100,missionIndex:10,missionTotal:10});
      const p=await C.paths();
      for(const n of [25,50,75])check(p.includes('aws/progress-'+n),'map jump reaches course threshold '+n);
      check(!p.includes('aws/progress-100'),'position 99 is not final course frame');
      await C.call('missionComplete',{n:2,title:'Storage'});
      await C.call('missionComplete',{n:2,title:'Storage'});
      equal(count(await C.paths(),'aws/mission-end-02'),1,'mission end action deduped');
      await C.call('finished');await C.call('finished');
      equal(count(await C.paths(),'aws/finish-clicked'),1,'explicit finish action deduped');
      const kinds='quiz bug order decision challenge-hint challenge-solution interview-answer interview-timer interview-followup interview-review lab code-copy sql-run'.split(' ');
      for(const kind of kinds){await C.call('interaction',kind);await C.call('interaction',kind);}
      for(const kind of kinds)equal(count(await C.paths(),'aws/interaction-'+kind),1,'one aggregate '+kind+' reach');
      const before=(await C.paths()).length;
      await C.call('interaction','PRIVATE_ANSWER');await C.call('interaction','quiz?email=person@example.com');await C.call('path','person@example.com');
      await C.call('event','?raw=PRIVATE_ANSWER','PRIVATE_ANSWER');
      equal((await C.paths()).length,before,'unknown category, path and malformed event are ignored');
      check((await C.hits()).filter(h=>/finish|mission-end|progress/.test(h.p||'')).every(h=>/clicked|position reached|final frame/.test(h.t)),'titles make aggregate event meaning explicit');
    });
    await test('hub links and scroll depth use bounded destinations',async()=>{
      const C=await setup({url:base+'index.html'});
      await C.page.evaluate(()=>{
        for(const id of ['course-link','external-link','unlisted-link','query-link']){
          const a=document.getElementById(id);a.addEventListener('click',e=>e.preventDefault());a.click();
        }
        Object.defineProperty(document.documentElement,'scrollHeight',{value:2000});
        Object.defineProperty(document.documentElement,'clientHeight',{value:1000});
        Object.defineProperty(window,'scrollY',{value:910,configurable:true});
        document.dispatchEvent(new Event('scroll'));
      });
      const p=await C.paths();
      equal(count(p,'hub/open-aws'),1,'known tutorial click counted');
      check(!p.some(x=>/private-person|example.net|email/.test(x)),'outbound, unknown and query links not sent');
      for(const n of [25,50,75,90])equal(count(p,'hub/scroll-'+n),1,'scroll '+n+' reach once');
      check(await C.page.locator('footer a[href="shared/analytics.html"]').count()===1,'hub links to analytics disclosure');
    });
    await test('privacy signals, explicit opt-out and localhost defaults prevent vendor loading',async()=>{
      for(const options of [{dnt:'1'},{gpc:true},{storedOptout:true},{url:base+'aws/index.html?notrack=1'},{cfg:{code:'a/b?email'} }]){
        const C=await setup(options);
        check(await C.page.evaluate(()=>LAB.analytics.active)===false,'collection disabled for '+JSON.stringify(options));
        equal(C.vendorRequests(),0,'no third-party script when disabled');
        await C.call('interaction','lab');
        equal((await C.hits()).length,0,'disabled interaction sends nothing');
      }
      const C=await setup({storedOptout:true,url:base+'aws/index.html?notrack=0'});
      check(await C.page.evaluate(()=>LAB.analytics.active),'explicit opt-in clears stored opt-out');
      await C.page.goto(base+'aws/index.html?notrack=1');
      await C.page.goto(base+'aws/index.html');
      equal(await C.page.evaluate(()=>LAB.analytics.active),false,'opt-out persists into next document');
    });
    await test('local development addresses and file URLs are excluded without force',async()=>{
      for(const url of ['http://localhost/course/','http://127.0.0.1/course/','http://127.3.4.5/course/','http://0.0.0.0/course/','http://[::1]/course/','file:///tmp/index.html']){
        const loc=new URL(url), storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
        const w={LAB:{config:{id:'aws'}},LAB_ANALYTICS:{code:'test-site'},addEventListener:function(){}};
        const context={window:w,location:loc,navigator:{},localStorage:storage,sessionStorage:storage,document:{readyState:'complete',querySelector:()=>null},URL,URLSearchParams,Date};
        vm.runInNewContext(source,context,{filename:'analytics.js'});
        equal(w.LAB.analytics.active,false,'no collection on '+url);
      }
    });
    await test('corrupt session storage and cross-tab opt-out fail safely',async()=>{
      for(const session of [
        {v:2,last:epoch,sent:'bad',engaged:{}},
        {v:2,last:epoch,sent:[],engaged:{}},
        {v:2,last:epoch,sent:{},engaged:'bad'},
        {v:2,last:epoch,sent:{},engaged:[]},
        {v:99,last:epoch,sent:{},engaged:{}},
        {v:2,last:epoch+100000,sent:{},engaged:{}}
      ]){
        const C=await setup({session});
        await C.call('interaction','lab');
        check((await C.paths()).includes('aws/interaction-lab'),'invalid stored schema resets safely');
        equal(C.errors,[],'corrupt stored schema causes no uncaught error');
      }
      const C=await setup();
      const before=(await C.hits()).length;
      await C.page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'dep.notrack',newValue:'1'})));
      equal(await C.page.evaluate(()=>LAB.analytics.active),false,'other-tab opt-out disables this open document');
      await C.call('interaction','lab');await C.time(60000,true);
      equal((await C.hits()).length,before,'open document sends nothing after other-tab opt-out');
      equal(await C.page.evaluate(()=>sessionStorage.getItem('dep.analytics.v2')),null,'analytics session cleared after opt-out');
      await C.page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'dep.notrack',newValue:null})));
      equal(await C.page.evaluate(()=>LAB.analytics.active),false,'removing preference does not silently reactivate this document');
    });
    await test('blocked storage and delayed or broken analytics never break the page',async()=>{
      const C=await setup({blockStorage:true});
      await C.call('interaction','lab');await C.call('interaction','lab');
      equal(count(await C.paths(),'aws/interaction-lab'),1,'in-memory fallback dedupes when storage blocked');
      equal(C.errors,[],'blocked storage has no uncaught browser errors');
      const D=await setup({delayVendor:true});
      for(let n=0;n<140;n++)await D.call('event','queue-'+n,'Queued event');
      D.release();await D.page.waitForTimeout(100);
      equal((await D.hits()).length,100,'vendor queue has a hard 100-hit bound');
      await D.call('event','queue-139','Queued event');
      equal(count(await D.paths(),'aws/queue-139'),1,'event rejected by full queue can be retried after loading');
      const failureOptions={loadError:true};
      const E=await setup(failureOptions);
      await E.call('interaction','lab');
      equal(E.errors,[],'vendor download failure stays isolated');
      equal((await E.call('status')).failed,true,'load failure visible through status');
      failureOptions.loadError=false;
      await E.page.reload();await E.page.waitForTimeout(25);
      check((await E.paths()).includes('aws/course-opened'),'failed pending events are retried on a successful reload');
      const F=await setup({vendor:'window.goatcounter={count:function(){throw new Error("vendor failed")}};'});
      await F.call('interaction','lab');
      equal(F.errors,[],'missing get_data fails closed with no page error');
      const G=await setup({vendor:STUB.replace('window.__hits.push(this.get_data(o));','throw new Error("vendor failed");')});
      await G.call('interaction','lab');
      equal(G.errors,[],'throwing vendor count cannot break a lesson');
    });
    await test('query and referrer scrubber retains only bounded campaign codes',async()=>{
      const C=await setup({url:base+'aws/index.html?utm_source=linkedin&utm_campaign=launch-2026&utm_medium=social&email=person%40example.com&q=PRIVATE_ANSWER&notrack=0&utm_term=secret'});
      const hits=await C.hits();
      check(hits.length>0,'intercepted vendor contract exercised');
      for(const h of hits){
        equal(h.q,'?utm_campaign=launch-2026&utm_source=linkedin&utm_medium=social','only whitelisted campaign values retained');
        check(!JSON.stringify(h).includes('PRIVATE_ANSWER')&&!JSON.stringify(h).includes('person@'),'raw query contents excluded');
      }
      const data=await C.page.evaluate(()=>goatcounter.get_data({path:'aws/test',title:'Test',referrer:'https://example.net/search?q=PRIVATE_ANSWER#email=person@example.com'}));
      equal(data.r,'https://example.net/','referrer query/path/hash stripped to origin');
      const D=await setup({url:base+'aws/index.html?utm_source=person%40example.com&utm_campaign='+ 'x'.repeat(65)+'&campaign=good_code&ref=has%20spaces&src=source-ok'});
      equal((await D.hits())[0].q,'?campaign=good_code&src=source-ok','invalid, overlong and free-text campaign values rejected');
    });
    if(process.env.GOATCOUNTER_SCRIPT_PATH){
      await test('real official vendor wire payload is sanitized before any collector request',async()=>{
        const vendor=fs.readFileSync(process.env.GOATCOUNTER_SCRIPT_PATH,'utf8');
        const C=await setup({vendor,url:base+'aws/index.html?utm_source=linkedin&utm_campaign=launch-2026&email=person%40example.com&search=PRIVATE_ANSWER&notrack=0'});
        await C.call('frame',{n:1,title:'Storage'},{type:'talk'},{index:1,total:10,missionIndex:1,missionTotal:5});
        await C.page.waitForTimeout(150);
        check(C.collector.length>=3,'real vendor attempted mocked collector beacons');
        for(const req of C.collector){
          const url=new URL(req.url), q=url.searchParams.get('q');
          equal(q,'?utm_campaign=launch-2026&utm_source=linkedin','wire q contains only accepted campaign codes');
          check(!decodeURIComponent(req.url).includes('PRIVATE_ANSWER')&&!decodeURIComponent(req.url).includes('person@'),'wire excludes raw query secrets');
          check(!url.searchParams.get('p').includes('?'),'canonical page/event path excludes query');
          check(!url.searchParams.has('ans')&&!url.searchParams.has('grades'),'no learner answers or scores in transport');
        }
        const wire=await C.page.evaluate(()=>goatcounter.url({path:'aws/test',title:'Test',referrer:'https://search.example/query?email=person@example.com#PRIVATE_ANSWER'}));
        equal(new URL(wire).searchParams.get('r'),'https://search.example/','real vendor URL builder uses sanitized referrer');
        equal(C.errors,[],'real vendor loading and wrappers produce no uncaught errors');
      });
    }else console.log('SKIP real-vendor wire check: set GOATCOUNTER_SCRIPT_PATH to a locally downloaded official count.js.');
    console.log(assertions+' detailed analytics checks passed');
    if(process.env.ANALYTICS_TEST_REPORT)fs.writeFileSync(process.env.ANALYTICS_TEST_REPORT,JSON.stringify({passed:true,assertions,tests:results,realVendor:!!process.env.GOATCOUNTER_SCRIPT_PATH,scope:'Headless browser fixtures; all network requests intercepted or aborted. No live analytics hits.'},null,2)+'\n');
  }finally{for(const ctx of contexts.splice(0))await ctx.close();await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
