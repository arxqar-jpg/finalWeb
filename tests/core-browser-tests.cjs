const {chromium}=require(process.env.CODEQUIZ_PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'),'utf8'));
const base=process.env.CODEQUIZ_BASE_URL || 'http://127.0.0.1:4173/';
const report=path.join(root,'report/final');fs.mkdirSync(path.join(report,'screenshots'),{recursive:true});
const passed=[];const errors=[];
async function test(name,fn){await fn();passed.push(name);console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({channel:process.env.CODEQUIZ_CHANNEL || 'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Qyzylorda'});
 await context.route('https://code.jquery.com/**',r=>r.abort());
 const p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>errors.push(e.message));
 const go=file=>p.goto(base+file,{waitUntil:'domcontentloaded'});
 const screen=name=>p.screenshot({path:path.join(report,'screenshots',name+'.png'),fullPage:true,animations:'disabled'});
 const start=async id=>{await go('quiz.html#'+id);await p.locator('[data-quiz-topic='+id+']').click();await p.getByRole('button',{name:/^(Start quiz|Start fresh)$/}).click();};
 async function complete(topic,wrong=false){
  await start(topic.id);
  for(let i=0;i<topic.questions.length;i++){
   assert.equal(await p.locator('#quiz-content h2').textContent(),topic.questions[i].prompt);
   await p.locator('.session-answer-form input').nth(wrong ? (topic.questions[i].answer+1)%topic.questions[i].options.length : topic.questions[i].answer).check();
   await p.getByRole('button',{name:i===topic.questions.length-1?'Review answers':'Next question',exact:true}).first().click();
  }
  await p.getByRole('button',{name:'Submit answers',exact:true}).click();
 }
 try{
 await test('Local API returns the curated 18-question bank and all pages initialize offline jQuery',async()=>{
  const api=await p.request.get(base+'api/questions');assert.equal(api.status(),200);assert.equal((await api.json()).topics.reduce((n,t)=>n+t.questions.length,0),18);
  for(const file of ['index.html','quiz.html','study.html','about.html','contact.html','profile.html']){await go(file);assert.equal(await p.evaluate(()=>jQuery.fn.jquery),'4.0.0');assert.match(await p.locator('#current-date-time').textContent(),/2026/);await p.evaluate(()=>document.fonts.ready);assert.ok(await p.evaluate(()=>document.fonts.check('500 16px Figtree')&&document.fonts.check('600 30px Sora')));}
  await go('index.html');await screen('01-overview');
 });
 await test('Loading, HTTP error, Retry, malformed JSON and static-host fallback are real request paths',async()=>{
  await p.evaluate(()=>localStorage.clear());let attempts=0;
  await p.route('**/api/questions',async r=>{attempts++;if(attempts===1)await r.fulfill({status:503,body:'Unavailable'});else await r.continue();});
  await go('quiz.html');await p.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.match(await p.locator('#quiz-content').textContent(),/HTTP 503/);await p.getByRole('button',{name:'Try again',exact:true}).click();await p.getByRole('button',{name:'Start quiz',exact:true}).waitFor();assert.equal(attempts,2);await p.unroute('**/api/questions');
  await p.evaluate(()=>localStorage.clear());await p.route('**/api/questions',r=>r.fulfill({status:200,contentType:'application/json',body:'{"wrong":true}'}));await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Try again',exact:true}).waitFor();assert.match(await p.locator('#quiz-content').textContent(),/invalid format/);await p.unroute('**/api/questions');
  await p.route('**/api/questions',r=>r.fulfill({status:404,body:'Not found'}));await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Start quiz',exact:true}).waitFor();await p.unroute('**/api/questions');
  await p.evaluate(()=>localStorage.clear());let release;const gate=new Promise(resolve=>release=resolve);await p.route('**/api/questions',async r=>{await gate;await r.continue();});await go('quiz.html');await p.locator('#quiz-app[aria-busy=true]').waitFor();assert.match(await p.locator('#quiz-content').textContent(),/Loading your quizzes/);release();await p.getByRole('button',{name:'Start quiz',exact:true}).waitFor();await p.unroute('**/api/questions');
 });
 await test('Failed network uses the saved bank and corrupted browser JSON never crashes initialization',async()=>{
  await p.route('**/api/questions',r=>r.abort());await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Start quiz',exact:true}).waitFor();assert.ok(await p.locator('#bank-notice').isVisible());await p.unroute('**/api/questions');
  await p.evaluate(()=>{localStorage.setItem('codequiz-endterm:attempts','{bad');localStorage.setItem('codequiz-endterm:draft-java','{bad');});await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Start quiz',exact:true}).waitFor();
 });
 await test('Question navigation, review flags, incomplete submission and exact draft restoration work',async()=>{
  await start('java');await p.locator('.session-answer-form input').nth(0).check();await p.getByRole('button',{name:'Mark for review',exact:true}).click();await p.getByRole('button',{name:'Next question',exact:true}).click();assert.match(await p.locator('.session-eyebrow').textContent(),/QUESTION 2 OF 6/);
  await p.locator('#session-summary').getByRole('button',{name:'Review answers',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Submit answers',exact:true}).count(),0);assert.match(await p.locator('#quiz-content').textContent(),/5 questions still need/);
  await p.getByRole('button',{name:'Answer remaining questions',exact:true}).click();await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Resume attempt',exact:true}).click();assert.match(await p.locator('.session-eyebrow').textContent(),/QUESTION 2 OF 6/);
  await p.getByRole('button',{name:'Question 1, answered, marked for review',exact:true}).click();assert.ok(await p.locator('.session-answer-form input').nth(0).isChecked());assert.equal(await p.getByRole('button',{name:'Marked for review',exact:true}).getAttribute('aria-pressed'),'true');await screen('02-quiz-session');
  await p.evaluate(()=>localStorage.removeItem('codequiz-endterm:draft-java'));
 });
 await test('Every topic scores six correct answers, renders explanations and saves one result per submit',async()=>{
  for(const topic of bank.topics){await complete(topic);assert.equal(await p.locator('.result-score strong').textContent(),'6 / 6');assert.equal(await p.locator('.answer-explanation').count(),6);assert.equal(await p.locator('.answer-explanation summary .text-success').count(),6);}
  const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('codequiz-endterm:attempts')));assert.equal(saved.length,3);await screen('03-result');
 });
 await test('Wrong-answer explanations and missed-question practice use the correct answer identities',async()=>{
  await complete(bank.topics[0],true);assert.equal(await p.locator('.result-score strong').textContent(),'0 / 6');assert.equal(await p.locator('.answer-explanation[open]').count(),6);await p.getByRole('button',{name:'Practise missed questions',exact:true}).click();
  for(let i=0;i<6;i++){await p.locator('.session-answer-form input').nth(bank.topics[0].questions[i].answer).check();await p.getByRole('button',{name:i===5?'Review answers':'Next question',exact:true}).first().click();}await p.getByRole('button',{name:'Submit answers',exact:true}).click();assert.equal(await p.locator('.result-score strong').textContent(),'6 / 6');
 });
 await test('Results survive reload, history review works, Overview calculates real scores and clear is scoped',async()=>{
  await go('quiz.html#history');await p.locator('.results-table').waitFor();assert.equal(await p.locator('.results-table tbody tr').count(),5);await p.reload({waitUntil:'domcontentloaded'});await p.locator('.results-table button').first().click();assert.equal(await p.locator('.result-score strong').textContent(),'6 / 6');await go('index.html');assert.equal(await p.locator('#practice-attempts').textContent(),'5');assert.equal(await p.locator('#practice-average').textContent(),'75%');await screen('04-progress');
  await go('quiz.html#history');await p.getByRole('button',{name:'Clear history',exact:true}).click();await p.getByRole('button',{name:'Keep results',exact:true}).click();assert.equal(await p.locator('.results-table tbody tr').count(),5);
 });
 await test('Practice plan persists safely across pages, edits and Reset removes the saved plan',async()=>{
  await go('study.html');await p.locator('#plan-name').fill('Дархан');await p.locator('#plan-next').click();await p.locator('#plan-topic').selectOption('python');await p.locator('#plan-minutes').selectOption('25');await p.locator('#plan-next').click();await p.locator('#sound-enabled').uncheck();await p.locator('#plan-finish').click();await p.reload({waitUntil:'domcontentloaded'});assert.match(await p.locator('#plan-result').textContent(),/Дархан.*25 minutes of Python/);assert.equal(await p.locator('#plan-quiz-link').getAttribute('href'),'quiz.html#python');assert.ok(await p.locator('#copy-plan').isVisible());await p.locator('#plan-back').click();await p.locator('#plan-minutes').selectOption('10');await p.locator('#plan-next').click();await p.locator('#plan-finish').click();await p.reload({waitUntil:'domcontentloaded'});assert.match(await p.locator('#plan-result').textContent(),/10 minutes/);await p.locator('#plan-reset').click();await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.locator('#plan-name').inputValue(),'');assert.ok(!(await p.locator('#copy-plan').isVisible()));
 });
 await test('Existing search, literal highlighting, category filters, FAQ and themes remain functional',async()=>{
  await go('index.html');await p.locator('#topic-search').fill('PYTHON');assert.equal(await p.locator('.topic-card').count(),1);assert.match(await p.locator('.topic-meta').textContent(),/6 questions/);await p.locator('#topic-search').press('ArrowDown');await p.locator('#topic-search').press('Enter');assert.equal(await p.locator('#topic-search').inputValue(),'Python essentials');await p.locator('#topic-search').fill('.*');assert.equal(await p.locator('.topic-card').count(),0);await p.locator('#topic-search').fill('');await p.locator('.topic-filter[data-category=java]').click();assert.equal(await p.locator('.topic-card').count(),1);await p.locator('.platform-resources summary').click();await p.locator('#faq-question-1').click();assert.equal(await p.locator('#faq-question-1').getAttribute('aria-expanded'),'true');await p.locator('#btn-change-bg').click();const theme=await p.locator('body').getAttribute('data-theme');await go('quiz.html');assert.equal(await p.locator('body').getAttribute('data-theme'),theme);if (theme !== 'forest') await p.locator('#btn-change-bg').click();
 });
 await test('Registration/contact validation, phone, spinner and saved feedback remain correct',async()=>{
  await go('contact.html');await p.locator('#contact-form button[type=submit]').click();assert.equal(await p.locator('#contact-form .is-invalid').count(),5);await p.locator('#user-name').fill('Darkhan');await p.locator('#user-email').fill('darkhan@astanait.edu.kz');await p.locator('#user-phone').fill('+7 701 123 45 67');await p.locator('#user-message').fill('Please add another programming topic.');await p.locator('#contact-consent').check();await p.locator('#contact-form button[type=submit]').click();assert.ok(await p.locator('#contact-form button[type=submit]').isDisabled());await p.waitForFunction(()=>!document.querySelector('#contact-form button[type=submit]').disabled);assert.match(await p.locator('#contact-feedback').textContent(),/saved on this browser/);await p.locator('.signup-button').click();await p.locator('#registration-form button[type=submit]').click();assert.equal(await p.locator('#registration-form .is-invalid').count(),6);await p.keyboard.press('Escape');
 });
 await test('All six pages fit 320/360/390/768/992/1440px; mobile quiz navigation and results remain reachable',async()=>{
  for(const width of [320,360,390,768,992,1440]){await p.setViewportSize({width,height:900});for(const file of ['index.html','quiz.html','study.html','about.html','contact.html','profile.html']){await go(file);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+file);}}
  await p.setViewportSize({width:390,height:844});await start('python');await p.locator('.session-answer-form input').nth(0).check();await p.getByRole('button',{name:'Next question',exact:true}).click();assert.match(await p.locator('.session-eyebrow').textContent(),/QUESTION 2/);await screen('05-mobile-quiz');await go('quiz.html#history');await p.locator('.results-table').waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await screen('06-mobile-history');
 });
 await test('History clearing leaves other local data intact and no JavaScript runtime errors occurred',async()=>{
  await p.evaluate(()=>localStorage.setItem('codequiz-endterm:practice-plan',JSON.stringify({name:'Ali',topic:'java',minutes:'15'})));await p.getByRole('button',{name:'Clear history',exact:true}).click();await p.getByRole('button',{name:'Clear results',exact:true}).click();assert.ok(await p.locator('.history-empty').isVisible());assert.ok(await p.evaluate(()=>localStorage.getItem('codequiz-endterm:practice-plan')));assert.deepEqual(errors,[]);
 });
 fs.writeFileSync(path.join(report,'test-results.json'),JSON.stringify({verifiedAt:new Date().toISOString(),base,browser:browser.version(),passed,errors},null,2));console.log(passed.length+' core groups passed; no JavaScript runtime errors.');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
