(function () {
    'use strict';
    let request;
    function validate(bank) {
        if (!bank || !Number.isInteger(bank.version) || !Array.isArray(bank.topics) || bank.topics.length !== 3) throw new Error('The question bank has an invalid format.');
        const topicIds = new Set();
        const questionIds = new Set();
        bank.topics.forEach(topic => {
            if (!['java', 'python', 'htmlcss'].includes(topic.id) || topicIds.has(topic.id) || typeof topic.title !== 'string' || !Array.isArray(topic.questions) || !topic.questions.length) throw new Error('The question bank contains an invalid topic.');
            topicIds.add(topic.id);
            topic.questions.forEach(q => {
                if (typeof q.id !== 'string' || questionIds.has(q.id) || typeof q.prompt !== 'string' || typeof q.code !== 'string' || typeof q.explanation !== 'string' || typeof q.skill !== 'string' || !Array.isArray(q.options) || q.options.length < 2 || !q.options.every(option => typeof option === 'string') || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error('The question bank contains an invalid question.');
                questionIds.add(q.id);
            });
        });
        return bank;
    }
    async function fetchBank() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            if (location.protocol === 'file:') throw new Error('Open CodeQuiz through its local server: run npm start, then visit http://127.0.0.1:4173.');
            const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
            let response = await fetch(localPreview ? 'api/questions' : 'data/questions.json', { signal:controller.signal, cache:'no-store' });
            // GitHub Pages and other static hosts serve the same JSON without a Node API route.
            if (response.status === 404) response = await fetch('data/questions.json', { signal:controller.signal, cache:'no-store' });
            if (!response.ok) throw new Error('The question bank could not be loaded (HTTP ' + response.status + ').');
            const bank = validate(await response.json());
            CodeQuizStorage.write('question-bank', bank);
            return { bank, cached:false };
        } catch (error) {
            try {
                const cached = validate(CodeQuizStorage.read('question-bank', null));
                return { bank:cached, cached:true };
            } catch (_) {
                if (error.name === 'AbortError') throw new Error('The request took too long. Check the connection and try again.');
                if (error instanceof TypeError) throw new Error('The question bank could not be reached. Check the connection and try again.');
                throw error;
            }
        } finally {
            clearTimeout(timeout);
        }
    }
    window.CodeQuizData = {
        load: function (reload) {
            if (reload) request = null;
            if (!request) request = fetchBank().catch(error => { request = null; throw error; });
            return request;
        }
    };
}());
