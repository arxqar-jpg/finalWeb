(function () {
    'use strict';
    const storage = window.CodeQuizStorage;
    const root = document.getElementById('quiz-app');
    if (!root) return;
    let bank;
    let topic;
    let session;
    let stage = 'loading';
    let runningAt = 0;
    let submitBusy = false;
    let resultId = null;
    const content = document.getElementById('quiz-content');
    const summary = document.getElementById('session-summary');

    // Build question content as text nodes, never as executable HTML from JSON.
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function button(text, className, action) {
        const node = el('button', 'btn ' + className, text);
        node.type = 'button';
        node.addEventListener('click', action);
        return node;
    }
    function announce(text) { document.getElementById('quiz-announcement').textContent = text; }
    function focusHeading() {
        const heading = content.querySelector('h2');
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll:true }); heading.scrollIntoView({ block:'nearest', behavior:'instant' }); }
        $(window).trigger('resize');
    }
    function duration(seconds) {
        seconds = Math.max(0, Math.floor(seconds));
        return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    }
    function records() {
        const saved = storage.read('attempts', []);
        if (!Array.isArray(saved)) return [];
        return saved.filter(r => r && typeof r.id === 'string' && typeof r.topicId === 'string' && typeof r.topicTitle === 'string' && Number.isInteger(r.total) && r.total > 0 && Number.isInteger(r.score) && r.score >= 0 && r.score <= r.total && Number.isFinite(r.seconds) && Number.isFinite(Date.parse(r.completedAt)) && Array.isArray(r.review) && r.review.length === r.total && r.review.every(q => q && typeof q.prompt === 'string' && typeof q.code === 'string' && typeof q.explanation === 'string' && typeof q.correctAnswer === 'string' && typeof q.userAnswer === 'string' && typeof q.correct === 'boolean')).slice(0, 30);
    }
    function stopClock() {
        if (session && runningAt) session.elapsedMs += Date.now() - runningAt;
        runningAt = 0;
    }
    function saveDraft() {
        if (!session || !topic || !['question', 'check'].includes(stage)) return;
        const elapsed = runningAt ? Date.now() - runningAt : 0;
        storage.write('draft-' + topic.id, Object.assign({}, session, { elapsedMs:session.elapsedMs + elapsed }));
    }
    function draftFor(selectedTopic) {
        const saved = storage.read('draft-' + selectedTopic.id, null);
        if (!saved || saved.version !== bank.version || !Array.isArray(saved.ids) || !saved.ids.length || new Set(saved.ids).size !== saved.ids.length || !Number.isInteger(saved.index) || saved.index < 0 || saved.index >= saved.ids.length || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers) || !Array.isArray(saved.flags) || !['full','missed'].includes(saved.mode) || !Number.isFinite(saved.elapsedMs) || saved.elapsedMs < 0) return null;
        const questions = selectedTopic.questions;
        if (!saved.ids.every(id => questions.some(q => q.id === id))) return null;
        if (!Object.keys(saved.answers).every(id => saved.ids.includes(id) && Number.isInteger(saved.answers[id]) && saved.answers[id] >= 0 && saved.answers[id] < questions.find(q => q.id === id).options.length)) return null;
        saved.flags = saved.flags.filter(id => saved.ids.includes(id));
        return saved;
    }
    function questions() { return session.ids.map(id => topic.questions.find(q => q.id === id)); }
    function answered(q) { return Number.isInteger(session.answers[q.id]); }
    function activateTab(id) {
        document.getElementById('quiz-workspace').setAttribute('aria-labelledby', 'tab-' + id);
        document.querySelectorAll('[data-quiz-topic]').forEach(tab => {
            const active = tab.dataset.quizTopic === id;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
        });
    }
    function selectRoute() {
        if (!bank) return;
        if (!bank.topics.length && location.hash !== '#history') { load(true); return; }
        saveDraft(); stopClock(); session = null; resultId = null;
        const id = location.hash.slice(1);
        if (id === 'history') { stage = 'history'; activateTab('history'); renderHistory(); return; }
        topic = bank.topics.find(t => t.id === id) || bank.topics[0];
        stage = 'intro'; activateTab(topic.id); renderIntro();
    }
    function heading(text, eyebrow) {
        content.replaceChildren();
        if (eyebrow) content.append(el('p', 'session-eyebrow mb-2', eyebrow));
        content.append(el('h2', 'h4 mb-3', text));
    }
    function renderIntro() {
        const draft = draftFor(topic);
        heading(topic.title, 'CODE READING · ' + topic.questions.length + ' QUESTIONS');
        content.append(el('p', 'text-secondary mb-4', topic.description));
        const guide = el('ul', 'session-guide ps-3 mb-4');
        ['Read one code example at a time.', 'Move freely between questions and mark any for review.', 'Submit when every question is answered; then read the explanations.'].forEach(text => guide.append(el('li', 'mb-2', text)));
        content.append(guide);
        const row = el('div', 'd-flex flex-wrap gap-2');
        if (draft) {
            content.append(el('p', 'saved-session-note p-3 mb-3', 'Unfinished attempt: ' + Object.keys(draft.answers).length + ' of ' + draft.ids.length + ' answered. Resume where you stopped, or start fresh to replace it.'));
            row.append(button('Resume attempt', 'btn-primary', () => begin(draft.ids, draft)));
            row.append(button('Start fresh', 'btn-outline-secondary', () => begin(topic.questions.map(q => q.id))));
        } else row.append(button('Start quiz', 'btn-primary px-4', () => begin(topic.questions.map(q => q.id))));
        content.append(row);
        const previous = records().filter(r => r.topicId === topic.id && r.mode === 'full' && r.version === bank.version);
        summary.replaceChildren(el('h2', 'h6 mb-3', 'Your progress'));
        summary.append(el('p', 'text-secondary small mb-3', previous.length ? previous.length + ' completed full ' + topic.language + ' attempt' + (previous.length === 1 ? '' : 's') + ' on this browser.' : 'Your results will be saved on this browser.'));
        if (previous.length) {
            const best = previous.reduce((a, b) => a.score / a.total >= b.score / b.total ? a : b);
            summary.append(el('strong', 'd-block mb-3', 'Best score: ' + best.score + ' / ' + best.total));
        }
        summary.append(button('View results', 'btn-outline-secondary btn-sm', () => route('history')));
        announce(topic.title + ' selected.');
    }
    function begin(ids, saved, mode) {
        resultId = null;
        session = saved || { version:bank.version, ids:ids.slice(), answers:{}, flags:[], index:0, elapsedMs:0, mode:mode || 'full' };
        stage = 'question'; runningAt = document.hidden ? 0 : Date.now();
        saveDraft(); renderQuestion(); focusHeading();
    }
    function renderQuestion() {
        stage = 'question';
        const q = questions()[session.index];
        heading(q.prompt, 'QUESTION ' + (session.index + 1) + ' OF ' + session.ids.length + ' · ' + q.skill);
        const pre = el('pre', 'question-code p-3 mb-4'); pre.append(el('code', '', q.code)); content.append(pre);
        const form = el('form', 'session-answer-form'); form.noValidate = true;
        const fieldset = el('fieldset', 'session-options');
        fieldset.append(el('legend', 'visually-hidden', 'Choose one answer'));
        q.options.forEach((option, index) => {
            const label = el('label', 'session-option d-flex align-items-start gap-3 p-3 mb-2');
            const input = el('input', 'form-check-input mt-1');
            input.type = 'radio'; input.name = 'answer'; input.value = String(index); input.checked = session.answers[q.id] === index;
            input.addEventListener('change', () => {
                session.answers[q.id] = index; saveDraft(); renderSummary();
                form.querySelectorAll('.session-option').forEach(node => node.classList.toggle('selected', node.querySelector('input').checked));
            });
            if (input.checked) label.classList.add('selected');
            label.append(input, el('code', 'answer-text', option)); fieldset.append(label);
        });
        form.append(fieldset);
        form.addEventListener('submit', event => { event.preventDefault(); next(); });
        const actions = el('div', 'session-actions d-flex flex-wrap align-items-center gap-2 mt-4 pt-3');
        const back = button('Previous', 'btn-outline-secondary', () => goQuestion(session.index - 1)); back.disabled = session.index === 0;
        const flag = button(session.flags.includes(q.id) ? 'Marked for review' : 'Mark for review', 'btn-link session-flag', () => {
            session.flags = session.flags.includes(q.id) ? session.flags.filter(id => id !== q.id) : session.flags.concat(q.id);
            saveDraft(); renderSummary(); flag.textContent = session.flags.includes(q.id) ? 'Marked for review' : 'Mark for review'; flag.setAttribute('aria-pressed', String(session.flags.includes(q.id)));
        });
        flag.setAttribute('aria-pressed', String(session.flags.includes(q.id)));
        const forward = el('button', 'btn btn-primary ms-auto', session.index === session.ids.length - 1 ? 'Review answers' : 'Next question');
        forward.type = 'submit';
        // The form submit handler also supports Enter without reloading the page.
        actions.append(back, flag, forward); form.append(actions); content.append(form); renderSummary();
        announce('Question ' + (session.index + 1) + ' of ' + session.ids.length + '. ' + q.skill + '.');
    }
    function next() {
        if (session.index < session.ids.length - 1) goQuestion(session.index + 1);
        else renderCheck();
    }
    function goQuestion(index) {
        if (index < 0 || index >= session.ids.length) return;
        session.index = index; saveDraft(); renderQuestion(); focusHeading();
    }
    function renderSummary() {
        if (!session) return;
        const list = questions();
        const count = list.filter(answered).length;
        summary.replaceChildren(el('h2', 'h6 mb-3', topic.language + ' session'));
        const totals = el('div', 'd-flex justify-content-between small mb-2');
        totals.append(el('span', 'text-secondary', 'Answered'), el('strong', '', count + ' / ' + list.length)); summary.append(totals);
        const track = el('div', 'session-progress mb-4'); const fill = el('div', '');
        fill.style.width = count / list.length * 100 + '%'; track.append(fill); track.setAttribute('role','progressbar'); track.setAttribute('aria-label','Questions answered'); track.setAttribute('aria-valuemin','0'); track.setAttribute('aria-valuemax',String(list.length)); track.setAttribute('aria-valuenow',String(count)); summary.append(track);
        const nav = el('div', 'question-navigator mb-3'); nav.setAttribute('role','group'); nav.setAttribute('aria-label','Go to question');
        list.forEach((q, index) => {
            const node = button(String(index + 1), 'question-number' + (answered(q) ? ' is-answered' : '') + (session.flags.includes(q.id) ? ' is-flagged' : ''), () => goQuestion(index));
            node.setAttribute('aria-label','Question ' + (index + 1) + (answered(q) ? ', answered' : ', unanswered') + (session.flags.includes(q.id) ? ', marked for review' : ''));
            if (stage === 'question' && index === session.index) node.setAttribute('aria-current','step');
            nav.append(node);
        }); summary.append(nav);
        summary.append(el('p', 'navigator-legend text-secondary small mb-3', 'Filled: answered · Dot: marked for review'));
        const clock = el('div', 'd-flex justify-content-between small session-clock pt-3');
        const time = el('span', '', duration((session.elapsedMs + (runningAt ? Date.now() - runningAt : 0)) / 1000)); time.id = 'session-time';
        clock.append(el('span', 'text-secondary', 'Active time'), time); summary.append(clock);
        summary.append(el('p', 'text-secondary small mt-3 mb-0', 'Answers are saved as you go. You can leave and resume later.'));
        if (stage !== 'check') summary.append(button('Review answers', 'btn-outline-secondary btn-sm mt-3', () => { renderCheck(); focusHeading(); }));
    }
    function renderCheck() {
        stage = 'check'; saveDraft();
        const list = questions();
        const missing = list.filter(q => !answered(q));
        heading('Review your answers', topic.title);
        content.append(el('p', 'text-secondary mb-4', missing.length ? missing.length + ' question' + (missing.length === 1 ? ' still needs' : 's still need') + ' an answer. Choose a question below to finish.' : 'Every question is answered. You can still make changes before submitting.'));
        const checks = el('div', 'answer-check-list mb-4');
        list.forEach((q, index) => {
            const row = button('', 'answer-check-row d-flex justify-content-between align-items-center gap-3 p-3', () => goQuestion(index));
            const text = el('span', 'text-start'); text.append(el('strong', 'd-block mb-1', (index + 1) + '. ' + q.skill), el('span', 'text-secondary small', answered(q) ? q.options[session.answers[q.id]] : 'No answer selected'));
            row.append(text, el('span', 'check-state small', !answered(q) ? 'Unanswered' : session.flags.includes(q.id) ? 'Marked' : 'Answered')); checks.append(row);
        }); content.append(checks);
        const actions = el('div', 'd-flex flex-wrap gap-2');
        actions.append(button('Back to questions', 'btn-outline-secondary', () => goQuestion(session.index)));
        if (missing.length) actions.append(button('Answer remaining questions', 'btn-primary ms-auto', () => goQuestion(list.findIndex(q => !answered(q)))));
        else actions.append(button('Submit answers', 'btn-primary ms-auto', submit));
        content.append(actions); renderSummary(); announce(missing.length ? missing.length + ' unanswered questions.' : 'Ready to submit. All questions are answered.');
    }
    function submit() {
        if (submitBusy || resultId || !session || !questions().every(answered)) return;
        submitBusy = true; stopClock();
        const review = questions().map(q => ({ id:q.id, skill:q.skill, prompt:q.prompt, code:q.code, userAnswer:q.options[session.answers[q.id]], correctAnswer:q.options[q.answer], correct:session.answers[q.id] === q.answer, explanation:q.explanation }));
        const record = { id:typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2), version:bank.version, topicId:topic.id, topicTitle:topic.title, mode:session.mode, completedAt:new Date().toISOString(), score:review.filter(q => q.correct).length, total:review.length, seconds:Math.round(session.elapsedMs / 1000), review };
        storage.write('attempts', [record].concat(records()).slice(0,30));
        storage.remove('draft-' + topic.id); resultId = record.id; stage = 'result'; session = null;
        renderResult(record); submitBusy = false; focusHeading(); announce('Quiz completed. ' + record.score + ' of ' + record.total + ' correct.');
        window.dispatchEvent(new CustomEvent('codequiz:results'));
    }
    function renderResult(record) {
        stage = 'result';
        const percent = Math.round(record.score / record.total * 100);
        heading(record.score === record.total ? 'Every answer correct.' : record.score / record.total >= 0.5 ? 'Good work. Keep building.' : 'A useful place to start.', record.topicTitle + (record.mode === 'missed' ? ' · MISSED QUESTIONS' : ' · COMPLETED'));
        const score = el('div', 'result-score d-flex align-items-center flex-wrap gap-3 mb-3');
        score.append(el('strong', '', record.score + ' / ' + record.total), el('span', 'text-secondary', percent + '% correct · ' + duration(record.seconds) + ' active time')); content.append(score);
        const track = el('div', 'session-progress result-progress mb-4'); const fill = el('div'); fill.style.width = percent + '%'; track.append(fill); content.append(track);
        const actions = el('div', 'd-flex flex-wrap gap-2 mb-4');
        const currentTopic = bank.topics.find(t => t.id === record.topicId);
        const missed = currentTopic ? record.review.filter(q => !q.correct && currentTopic.questions.some(item => item.id === q.id)).map(q => q.id) : [];
        function newAttempt(ids, mode, replace) {
            const draft = draftFor(currentTopic);
            if (draft && !replace) {
                let notice = document.getElementById('replace-draft-notice');
                if (notice) notice.remove();
                notice = el('div', 'saved-session-note p-3 mb-4'); notice.id = 'replace-draft-notice';
                notice.append(el('p', 'mb-3', 'You have an unfinished ' + currentTopic.language + ' attempt. Starting this practice will replace its saved answers.'));
                notice.append(button('Keep unfinished attempt', 'btn-outline-secondary btn-sm me-2', () => notice.remove()), button('Replace and start', 'btn-primary btn-sm', () => newAttempt(ids, mode, true)));
                actions.after(notice); notice.scrollIntoView({block:'nearest'}); return;
            }
            topic = currentTopic; activateTab(topic.id); history.replaceState(null, '', '#' + topic.id); begin(ids, null, mode);
        }
        if (missed.length) actions.append(button('Practise missed questions', 'btn-primary', () => newAttempt(missed, 'missed')));
        if (currentTopic) actions.append(button('New full attempt', missed.length ? 'btn-outline-secondary' : 'btn-primary', () => newAttempt(currentTopic.questions.map(q => q.id))));
        actions.append(button('Results history', 'btn-outline-secondary', () => { if (location.hash === '#history') renderHistory(); else route('history'); })); content.append(actions);
        content.append(el('h3', 'h5 mb-3', 'Understand your answers'));
        record.review.forEach((q, index) => {
            const details = el('details', 'answer-explanation mb-2'); details.open = !q.correct;
            const toggle = el('summary', 'p-3'); toggle.append(el('span', q.correct ? 'text-success' : 'text-danger', q.correct ? 'Correct' : 'Review'), document.createTextNode(' · ' + (index + 1) + '. ' + q.prompt)); details.append(toggle);
            const body = el('div', 'px-3 pb-3');
            const code = el('pre', 'question-code p-3 mb-3'); code.append(el('code', '', q.code)); body.append(code);
            body.append(el('p', 'mb-2', 'Your answer: ' + q.userAnswer));
            if (!q.correct) body.append(el('p', 'mb-2 fw-semibold', 'Correct answer: ' + q.correctAnswer));
            body.append(el('p', 'text-secondary mb-0', q.explanation)); details.append(body); content.append(details);
        });
        summary.replaceChildren(el('h2', 'h6 mb-3', 'Session complete'));
        const date = new Date(record.completedAt).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' });
        summary.append(el('p', 'small text-secondary mb-3', date), el('p', 'small mb-3', 'Your result and explanations are saved on this browser.'));
        const skills = [...new Set(record.review.filter(q => !q.correct).map(q => q.skill))];
        if (skills.length) { summary.append(el('h3', 'h6 mb-2', 'Next focus')); summary.append(el('p', 'small text-secondary mb-0', skills.join(' · '))); }
        else summary.append(el('p', 'small text-secondary mb-0', 'Try another topic or explain one answer to a teammate.'));
        $(window).trigger('resize');
    }
    function renderHistory() {
        stage = 'history'; session = null;
        const list = records();
        heading('Your results', 'PRACTICE HISTORY');
        content.append(el('p', 'text-secondary mb-4', 'The latest 30 attempts are kept on this browser. Full quizzes and missed-question practice are listed separately.'));
        summary.replaceChildren(el('h2', 'h6 mb-3', 'Practice overview'));
        summary.append(el('p', 'small mb-3', list.length + ' completed attempt' + (list.length === 1 ? '' : 's')));
        const full = list.filter(r => r.mode === 'full');
        if (full.length) summary.append(el('p', 'small mb-0', 'Full-quiz average: ' + Math.round(full.reduce((total, r) => total + r.score / r.total, 0) / full.length * 100) + '%'));
        if (!list.length) {
            const empty = el('div', 'history-empty p-4'); empty.append(el('h3', 'h5 mb-2', 'Your first result starts here.'), el('p', 'text-secondary mb-3', 'Choose a topic, complete a quiz and come back to see your progress.'), button('Choose a quiz', 'btn-primary', () => route('java'))); content.append(empty); return;
        }
        const tableWrap = el('div', 'table-responsive'); const table = el('table', 'table align-middle results-table mb-3');
        table.append(el('caption', 'visually-hidden', 'Saved CodeQuiz results'));
        const head = el('thead'); const headers = el('tr'); ['Topic / date','Score','Time',''].forEach(label => { const th = el('th','py-3 px-2',label); th.scope = 'col'; headers.append(th); }); head.append(headers); table.append(head);
        const body = el('tbody');
        list.forEach(record => {
            const row = el('tr'); const title = el('td', 'py-3 px-2 text-start');
            title.append(el('strong', 'd-block', record.topicTitle), el('span', 'small text-secondary d-block mt-1', new Date(record.completedAt).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' }) + (record.mode === 'missed' ? ' · Missed questions' : ' · Full quiz')));
            const score = el('td', 'py-3 px-2 text-nowrap', record.score + ' / ' + record.total); const time = el('td', 'py-3 px-2 text-nowrap', duration(record.seconds));
            const action = el('td','py-3 px-2'); const view = button('Review', 'btn-outline-secondary btn-sm', () => { resultId = record.id; renderResult(record); focusHeading(); }); view.setAttribute('aria-label','Review ' + record.topicTitle + ' result, ' + record.score + ' out of ' + record.total); action.append(view); row.append(title,score,time,action); body.append(row);
        }); table.append(body); tableWrap.append(table); content.append(tableWrap);
        const clear = button('Clear history', 'btn-link text-danger px-0', () => {
            clear.hidden = true;
            const prompt = el('div', 'saved-session-note p-3'); prompt.append(el('p', 'mb-2', 'Clear all saved results on this browser? Your unfinished quizzes and practice plan will stay.'));
            prompt.append(button('Keep results', 'btn-outline-secondary btn-sm me-2', renderHistory), button('Clear results', 'btn-danger btn-sm', () => { storage.remove('attempts'); renderHistory(); announce('Results history cleared.'); })); content.append(prompt);
        }); content.append(clear);
    }
    function route(id) {
        if (location.hash === '#' + id) selectRoute();
        else location.hash = id;
    }
    async function load(reload) {
        saveDraft(); stopClock();
        stage = 'loading';
        heading('Loading your quizzes…');
        const loading = el('p', 'text-secondary mb-0', 'Getting the latest question bank.'); const spinner = el('span', 'spinner-border spinner-border-sm me-2'); spinner.setAttribute('aria-hidden','true'); loading.prepend(spinner); content.append(loading);
        root.setAttribute('aria-busy','true'); summary.replaceChildren(el('p','small text-secondary mb-0','Your session will be ready shortly.'));
        try {
            const result = await CodeQuizData.load(reload); bank = result.bank;
            const note = document.getElementById('bank-notice'); note.hidden = !result.cached;
            note.replaceChildren(document.createTextNode('Using a saved question bank while the connection is unavailable. '));
            note.append(button('Retry connection', 'btn-link btn-sm p-0', () => load(true)));
            selectRoute();
        } catch (error) {
            heading('The quizzes could not load.'); content.append(el('p','text-secondary mb-3',error.message),button('Try again','btn-primary',() => load(true)));
            summary.replaceChildren(el('h2','h6 mb-3','Connection needed'),el('p','small text-secondary mb-0','Your previously saved results and plans remain on this browser.'));
            const historyButton = button('View saved results','btn-outline-secondary ms-2',() => { bank = {version:1,topics:[]}; activateTab('history'); renderHistory(); }); content.append(historyButton);
            announce('The question bank could not load. Try again.');
        } finally { root.removeAttribute('aria-busy'); }
    }
    window.addEventListener('hashchange', selectRoute);
    document.querySelectorAll('[data-quiz-topic]').forEach(tab => {
        tab.addEventListener('click', event => { event.preventDefault(); route(tab.dataset.quizTopic); });
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
            event.preventDefault();
            const tabs = [...document.querySelectorAll('[data-quiz-topic]')]; let index = tabs.indexOf(tab);
            index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
            tabs[index].focus(); route(tabs[index].dataset.quizTopic);
        });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { stopClock(); saveDraft(); } else if (session && ['question','check'].includes(stage)) runningAt = Date.now(); });
    window.addEventListener('pagehide', () => { stopClock(); saveDraft(); });
    window.addEventListener('storage', event => { if (event.key === storage.key('attempts') && stage === 'history') renderHistory(); });
    setInterval(() => {
        const time = document.getElementById('session-time');
        if (time && session) time.textContent = duration((session.elapsedMs + (runningAt ? Date.now() - runningAt : 0)) / 1000);
    }, 1000);
    setInterval(saveDraft, 10000);
    load();
}());
