(function () {
    'use strict';
    var root = document.getElementById('learning-resources');
    if (!root) return;
    var list = document.getElementById('resource-list');
    var status = document.getElementById('resource-status');
    var refresh = document.getElementById('refresh-resources');
    var sources = [
        { repo: 'TheAlgorithms/Java', title: 'Java examples', topic: 'Java' },
        { repo: 'TheAlgorithms/Python', title: 'Python examples', topic: 'Python' },
        { repo: 'freeCodeCamp/freeCodeCamp', title: 'Web curriculum', topic: 'HTML & CSS' }
    ];
    function node(tag, className, text) {
        var element = document.createElement(tag);
        element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }
    function valid(data, source) {
        return data && data.full_name === source.repo && Number.isInteger(data.stargazers_count) && data.stargazers_count >= 0 &&
            typeof data.description === 'string' && typeof data.pushed_at === 'string' && Number.isFinite(Date.parse(data.pushed_at));
    }
    async function fetchResource(source) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, 10000);
        try {
            var response = await fetch('https://api.github.com/repos/' + source.repo, { signal: controller.signal });
            if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub request limit reached. Please try again later.' : 'GitHub returned HTTP ' + response.status + '.');
            var data = await response.json();
            if (!valid(data, source)) throw new Error('GitHub returned an unexpected response.');
            CodeQuizStorage.write('resource-' + source.repo, { at: Date.now(), data: data });
            return { source: source, data: data, cached: false };
        } finally { clearTimeout(timer); }
    }
    async function load(force) {
        if (root.getAttribute('aria-busy') === 'true') return;
        root.setAttribute('aria-busy', 'true'); refresh.disabled = true;
        status.textContent = 'Loading learning resources from GitHub…'; list.replaceChildren();
        try {
            // A short cache avoids spending public API requests on each page visit.
            var results = await Promise.all(sources.map(async function (source) {
                var saved = CodeQuizStorage.read('resource-' + source.repo, null);
                if (!force && saved && valid(saved.data, source) && Number.isFinite(saved.at) && Date.now() - saved.at >= 0 && Date.now() - saved.at < 1800000) {
                    return { source: source, data: saved.data, cached: true };
                }
                try { return await fetchResource(source); }
                catch (error) {
                    if (saved && valid(saved.data, source)) return { source: source, data: saved.data, cached: true, offline: true };
                    return { source: source, error: error.name === 'AbortError' ? 'The request took too long.' : error instanceof TypeError ? 'Could not reach GitHub. Check your connection.' : error.message };
                }
            }));
            results.forEach(function (result) {
                var card = node('article', 'resource-card p-3');
                card.append(node('p', 'small text-secondary mb-2', result.source.topic), node('h3', 'h6 mb-3', result.source.title));
                if (result.error) card.append(node('p', 'text-secondary mb-0', result.error));
                else {
                    card.append(node('p', 'resource-description mb-3', result.data.description));
                    card.append(node('p', 'small text-secondary mb-3', result.data.stargazers_count.toLocaleString('en-US') + ' stars · Code updated ' + new Date(result.data.pushed_at).toLocaleDateString('en-GB')));
                    var link = node('a', 'btn btn-outline-primary btn-sm', 'Explore on GitHub →');
                    link.href = 'https://github.com/' + result.source.repo; link.target = '_blank'; link.rel = 'noopener noreferrer';
                    card.append(link);
                }
                list.append(card);
            });
            var failed = results.filter(function (result) { return !!result.error; }).length;
            status.textContent = failed ? 'Some resources could not load. Choose Try again to retry.' :
                results.some(function (result) { return result.offline; }) ? 'Showing saved resources while GitHub is unavailable.' :
                results.every(function (result) { return result.cached; }) ? 'Recently loaded from GitHub. Choose Refresh for current details.' : 'Loaded from the GitHub public API.';
            refresh.textContent = failed ? 'Try again' : 'Refresh';
        } finally { root.removeAttribute('aria-busy'); refresh.disabled = false; }
    }
    refresh.addEventListener('click', function () { load(true); });
    load(false);
}());
