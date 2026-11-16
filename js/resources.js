(function () {
    'use strict';
    var root = document.getElementById('learning-resources');
    if (!root) return;
    var list = document.getElementById('resource-list');
    var status = document.getElementById('resource-status');
    var refresh = document.getElementById('refresh-resources');
    var retryKey = 'resource-retry-after';
    var sources = [
        {
            repo: 'TheAlgorithms/Java',
            title: 'Java examples',
            topic: 'Java',
            description: 'Explore Java algorithms and data structures with practical code examples.'
        },
        {
            repo: 'TheAlgorithms/Python',
            title: 'Python examples',
            topic: 'Python',
            description: 'Practise Python by reading examples of algorithms and data structures.'
        },
        {
            repo: 'freeCodeCamp/freeCodeCamp',
            title: 'Web curriculum',
            topic: 'HTML & CSS',
            description:
                'Continue learning with free programming lessons and web development exercises.'
        }
    ];
    function node(tag, className, text) {
        var element = document.createElement(tag);
        element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }
    function valid(data, source) {
        return (
            data &&
            data.full_name === source.repo &&
            Number.isInteger(data.stargazers_count) &&
            data.stargazers_count >= 0 &&
            typeof data.description === 'string' &&
            typeof data.pushed_at === 'string' &&
            Number.isFinite(Date.parse(data.pushed_at))
        );
    }
    function retryAt() {
        var until = CodeQuizStorage.read(retryKey, 0);
        return Number.isFinite(until) && until > Date.now() ? until : 0;
    }
    function retryMessage(until) {
        var time = new Date(until).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return 'GitHub request limit reached. Try again after ' + time + '.';
    }
    function rememberRateLimit(response) {
        var now = Date.now();
        var reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        var retry = response.headers.get('retry-after');
        var after =
            retry === null
                ? 0
                : /^\d+$/.test(retry)
                  ? now + Number(retry) * 1000
                  : Date.parse(retry);
        var until = Math.max(
            Number.isFinite(reset) ? reset : 0,
            Number.isFinite(after) ? after : 0
        );
        if (until <= now) until = now + 60000;
        CodeQuizStorage.write(retryKey, until);
        return until;
    }
    async function fetchResource(source) {
        var until = retryAt();
        if (until) throw new Error(retryMessage(until));
        var controller = new AbortController();
        var timer = setTimeout(function () {
            controller.abort();
        }, 10000);
        try {
            var response = await fetch('https://api.github.com/repos/' + source.repo, {
                signal: controller.signal
            });
            if (!response.ok) {
                if (response.status === 403 || response.status === 429)
                    throw new Error(retryMessage(rememberRateLimit(response)));
                throw new Error('GitHub returned HTTP ' + response.status + '.');
            }
            var data = await response.json();
            if (!valid(data, source)) throw new Error('GitHub returned an unexpected response.');
            CodeQuizStorage.write('resource-' + source.repo, { at: Date.now(), data: data });
            return { source: source, data: data, cached: false };
        } finally {
            clearTimeout(timer);
        }
    }
    async function load(force) {
        if (root.getAttribute('aria-busy') === 'true') return;
        root.setAttribute('aria-busy', 'true');
        refresh.disabled = true;
        status.textContent = 'Loading learning resources from GitHub…';
        list.replaceChildren();
        try {
            // Keep the shared cache and stop further requests when GitHub asks us to wait.
            // Serial requests let a rate-limit response protect the remaining resources too.
            var results = [];
            for (var source of sources) {
                var saved = CodeQuizStorage.read('resource-' + source.repo, null);
                if (
                    !force &&
                    saved &&
                    valid(saved.data, source) &&
                    Number.isFinite(saved.at) &&
                    Date.now() - saved.at >= 0 &&
                    Date.now() - saved.at < 1800000
                ) {
                    results.push({ source: source, data: saved.data, cached: true });
                    continue;
                }
                try {
                    results.push(await fetchResource(source));
                } catch (error) {
                    if (saved && valid(saved.data, source))
                        results.push({
                            source: source,
                            data: saved.data,
                            cached: true,
                            offline: true
                        });
                    else
                        results.push({
                            source: source,
                            error:
                                error.name === 'AbortError'
                                    ? 'The request took too long.'
                                    : error instanceof TypeError
                                      ? 'Could not reach GitHub. Check your connection.'
                                      : error.message
                        });
                }
            }
            results.forEach(function (result) {
                var card = node('article', 'resource-card p-3');
                card.append(
                    node('p', 'small text-secondary mb-2', result.source.topic),
                    node('h3', 'h6 mb-3', result.source.title)
                );
                if (result.error) {
                    card.append(node('p', 'resource-description mb-3', result.source.description));
                    card.append(node('p', 'small text-secondary mb-3', result.error));
                } else {
                    card.append(node('p', 'resource-description mb-3', result.data.description));
                    card.append(
                        node(
                            'p',
                            'small text-secondary mb-3',
                            result.data.stargazers_count.toLocaleString('en-US') +
                                ' stars · Code updated ' +
                                new Date(result.data.pushed_at).toLocaleDateString('en-GB')
                        )
                    );
                }
                // The learning link remains useful even when live metadata is unavailable.
                // Star counts and update dates are shown only for actual API/cache responses.
                var link = node('a', 'btn btn-outline-primary btn-sm', 'Explore on GitHub →');
                link.href = 'https://github.com/' + result.source.repo;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                card.append(link);
                list.append(card);
            });
            var failed = results.filter(function (result) {
                return !!result.error;
            }).length;
            status.textContent = failed
                ? retryAt()
                    ? retryMessage(retryAt()) + ' Resource links remain available.'
                    : 'Some live details could not load. Resource links remain available; choose Try again to retry.'
                : results.some(function (result) {
                        return result.offline;
                    })
                  ? 'Showing saved resources while GitHub is unavailable.'
                  : results.every(function (result) {
                          return result.cached;
                      })
                    ? 'Recently loaded from GitHub. Choose Refresh for current details.'
                    : 'Loaded from the GitHub public API.';
            refresh.textContent = failed ? 'Try again' : 'Refresh';
        } finally {
            root.removeAttribute('aria-busy');
            refresh.disabled = false;
        }
    }
    refresh.addEventListener('click', function () {
        load(true);
    });
    load(false);
})();
