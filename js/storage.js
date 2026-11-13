// localStorage stores strings. These helpers keep JSON parsing and failures in one place.
(function () {
    'use strict';
    var prefix = 'codequiz-endterm:';
    var accountId = null;
    try { accountId = localStorage.getItem('codequiz-user-session'); } catch (_) {}
    var personal = /^(attempts|draft-|practice-plan|feedback)/;
    function storageKey(key) { return prefix + (accountId && personal.test(key) ? 'user-' + accountId + ':' : '') + key; }
    var memory = {};
    var removed = {};
    var warned = false;
    function unavailable() {
        if (warned) return;
        warned = true;
        window.dispatchEvent(new CustomEvent('codequiz:storage-error'));
    }
    window.CodeQuizStorage = {
        key: storageKey,
        read: function (key, fallback) {
            if (removed[key]) return fallback;
            if (Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
            try {
                var value = localStorage.getItem(storageKey(key));
                if (value === null) return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
                return JSON.parse(value);
            } catch (error) {
                if (error.name !== 'SyntaxError') unavailable();
                return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
            }
        },
        write: function (key, value) {
            delete removed[key];
            memory[key] = value;
            try { localStorage.setItem(storageKey(key), JSON.stringify(value)); return true; }
            catch (error) { unavailable(); return false; }
        },
        remove: function (key) {
            delete memory[key];
            removed[key] = true;
            try { localStorage.removeItem(storageKey(key)); } catch (error) { unavailable(); }
        }
    };
    window.addEventListener('storage', function (event) {
        if (event.key === null) { memory = {}; removed = {}; }
        else if (event.key.indexOf(prefix) === 0) {
            var key = event.key.slice(prefix.length);
            if (accountId && key.startsWith('user-' + accountId + ':')) key = key.slice(('user-' + accountId + ':').length);
            delete memory[key]; delete removed[key];
        }
    });
    window.addEventListener('codequiz:storage-error', function () {
        var note = document.getElementById('storage-notice');
        if (note) { note.hidden = false; note.textContent = 'Browser storage is unavailable. You can practise, but changes may not survive a reload.'; }
        if (typeof window.showNotification === 'function') window.showNotification('Browser storage is unavailable. Your work is kept for this page only.');
    });
}());
