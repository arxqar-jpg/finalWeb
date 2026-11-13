// Coursework authentication simulation. Accounts remain in this browser only.
(function () {
    'use strict';
    var usersKey = 'codequiz-users';
    var sessionKey = 'codequiz-user-session';

    function users() {
        var saved = JSON.parse(localStorage.getItem(usersKey) || '[]');
        if (!Array.isArray(saved)) throw new Error('Saved accounts could not be read.');
        return saved.filter(function (user) {
            return user && typeof user.id === 'string' && typeof user.name === 'string' &&
                typeof user.email === 'string' && typeof user.password === 'string' && typeof user.phone === 'string';
        });
    }

    window.CodeQuizAuth = {
        current: function () {
            try {
                var id = localStorage.getItem(sessionKey);
                return users().find(function (user) { return user.id === id; }) || null;
            } catch (error) { return null; }
        },
        register: function (details) {
            var saved = users();
            if (saved.some(function (user) { return user.email === details.email; })) {
                return 'An account with this email already exists. Choose Log in.';
            }
            saved.push({
                id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
                name: details.name, email: details.email, phone: details.phone,
                password: details.password, createdAt: new Date().toISOString()
            });
            localStorage.setItem(usersKey, JSON.stringify(saved));
            return '';
        },
        login: function (email, password) {
            var user = users().find(function (entry) { return entry.email === email && entry.password === password; });
            if (!user) return 'Email or password is incorrect. Check your details and try again.';
            localStorage.setItem(sessionKey, user.id);
            activeUserId = user.id;
            return '';
        },
        logout: function () { localStorage.removeItem(sessionKey); activeUserId = null; }
    };
    var loadedUser = CodeQuizAuth.current();
    var activeUserId = loadedUser ? loadedUser.id : null;

    var root = document.getElementById('account-dialog-root');
    if (root) root.innerHTML = `
    <div id="custom-modal-overlay" class="custom-modal-overlay p-2 p-sm-3" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1" inert>
      <div class="custom-modal-card">
        <div class="modal-header-custom px-3 px-sm-4 py-3">
          <h2 id="modal-title" class="m-0 fs-5">Your CodeQuiz account</h2>
          <button type="button" id="modal-close-btn" class="modal-close-btn btn btn-dark btn-sm px-2 py-1" aria-label="Close account dialog">&times;</button>
        </div>
        <div class="modal-body-custom p-3 p-sm-4">
          <p class="demo-note small">Accounts and progress are saved on this browser. Use a practice password.</p>
          <div class="modal-tabs mb-3" role="tablist" aria-label="Account options">
            <button type="button" class="modal-tab-btn active btn px-3 py-2 rounded-0" data-tab="register" id="modal-tab-register" role="tab" aria-controls="tab-register" aria-selected="true" tabindex="0">Sign up</button>
            <button type="button" class="modal-tab-btn btn px-3 py-2 rounded-0" data-tab="login" id="modal-tab-login" role="tab" aria-controls="tab-login" aria-selected="false" tabindex="-1">Log in</button>
          </div>
          <div id="tab-register" class="modal-tab-content active" role="tabpanel" aria-labelledby="modal-tab-register">
            <div id="reg-success-message" class="d-none" role="status"></div>
            <button id="registration-login-button" type="button" class="btn btn-primary w-100 mb-3" hidden>Continue to Log in</button>
            <form id="registration-form" novalidate>
              <div class="mb-3">
                <label for="reg-name" class="form-label">Full name</label>
                <input type="text" class="form-control" id="reg-name" autocomplete="name" aria-required="true" aria-describedby="err-reg-name" placeholder="Your full name">
                <div id="err-reg-name" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="mb-3">
                <label for="reg-email" class="form-label">Email address</label>
                <input type="text" inputmode="email" class="form-control" id="reg-email" autocomplete="email" aria-required="true" aria-describedby="err-reg-email" placeholder="name@domain.com">
                <div id="err-reg-email" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="mb-3">
                <label for="reg-phone" class="form-label">Phone number</label>
                <input type="tel" class="form-control" id="reg-phone" autocomplete="tel" aria-required="true" aria-describedby="phone-help err-reg-phone" placeholder="+7 701 123 45 67">
                <small id="phone-help" class="text-secondary">Use + and 10–15 digits; spaces, brackets and hyphens are allowed.</small>
                <div id="err-reg-phone" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="mb-3">
                <label for="reg-password" class="form-label">Password</label>
                <input type="password" class="form-control" id="reg-password" autocomplete="new-password" aria-required="true" aria-describedby="password-help err-reg-password">
                <small id="password-help" class="text-secondary">8–128 characters: uppercase, lowercase, a number and a symbol. No spaces.</small>
                <div id="err-reg-password" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="mb-3">
                <label for="reg-confirm-password" class="form-label">Confirm password</label>
                <input type="password" class="form-control" id="reg-confirm-password" autocomplete="new-password" aria-required="true" aria-describedby="err-reg-confirm-password">
                <div id="err-reg-confirm-password" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="reg-terms" aria-required="true" aria-describedby="err-reg-terms">
                <label class="form-check-label" for="reg-terms">I understand my account is stored on this browser.</label>
                <div id="err-reg-terms" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <button type="submit" class="btn btn-primary w-100 py-2">Create account</button>
            </form>
          </div>
          <div id="tab-login" class="modal-tab-content" role="tabpanel" aria-labelledby="modal-tab-login" hidden>
            <div id="login-feedback" class="d-none" role="status" aria-live="polite"></div>
            <form id="login-form" novalidate>
              <div class="mb-3">
                <label for="login-email" class="form-label">Email address</label>
                <input type="text" inputmode="email" class="form-control" id="login-email" autocomplete="username" aria-required="true" aria-describedby="err-login-email">
                <div id="err-login-email" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <div class="mb-3">
                <label for="login-password" class="form-label">Password</label>
                <input type="password" class="form-control" id="login-password" autocomplete="current-password" aria-required="true" aria-describedby="err-login-password">
                <div id="err-login-password" class="error-msg mt-1" aria-live="polite"></div>
              </div>
              <button type="submit" class="btn btn-primary w-100 py-2">Log in</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;

    document.addEventListener('DOMContentLoaded', function () {
        var user = CodeQuizAuth.current();
        if (user) {
            document.querySelectorAll('.signup-button').forEach(function (button) {
                var link = document.createElement('a');
                link.className = 'btn signup-button px-2 px-sm-3';
                link.href = 'profile.html'; link.textContent = 'Profile';
                button.replaceWith(link);
            });
        }
        var login = document.getElementById('login-form');
        if (login) {
            var email = document.getElementById('login-email');
            var password = document.getElementById('login-password');
            var feedback = document.getElementById('login-feedback');
            email.oninput = function () { showField(email, getEmailError(email.value)); feedback.classList.add('d-none'); };
            password.oninput = function () { showField(password, getPasswordError(password.value)); feedback.classList.add('d-none'); };
            login.onsubmit = function (event) {
                event.preventDefault();
                var emailOK = showField(email, getEmailError(email.value));
                var passwordOK = showField(password, getPasswordError(password.value));
                if (!emailOK || !passwordOK) { login.querySelector('.is-invalid').focus(); return; }
                var error;
                try { error = CodeQuizAuth.login(email.value.trim().toLowerCase(), password.value); }
                catch (_) { error = 'Browser storage is unavailable. Allow local storage to log in.'; }
                if (error) { feedback.className = 'alert alert-danger'; feedback.textContent = error; return; }
                location.href = 'profile.html';
            };
        }
        if (document.getElementById('profile-details')) renderProfile(user);
    });

    function renderProfile(user) {
        document.getElementById('profile-guest').hidden = !!user;
        document.getElementById('profile-details').hidden = !user;
        if (!user) return;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-phone').textContent = user.phone;
        document.getElementById('profile-joined').textContent = Number.isFinite(Date.parse(user.createdAt)) ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—';
        var attempts = CodeQuizStorage.read('attempts', []);
        if (!Array.isArray(attempts)) attempts = [];
        attempts = attempts.filter(function (r) { return r && Number.isInteger(r.score) && Number.isInteger(r.total) && r.total > 0 && r.score >= 0 && r.score <= r.total; });
        document.getElementById('profile-attempts').textContent = attempts.length;
        document.getElementById('profile-best').textContent = attempts.length ? Math.round(Math.max.apply(null, attempts.map(function (r) { return r.score / r.total; })) * 100) + '%' : '—';
        document.getElementById('logout-button').onclick = function () {
            try { CodeQuizAuth.logout(); location.href = 'index.html'; }
            catch (_) { document.getElementById('profile-feedback').textContent = 'Could not log out. Check browser storage permissions and try again.'; }
        };
    }
    // Refresh only for an actual account change. Adding an unrelated account must
    // not reload another tab and erase its open registration form.
    window.addEventListener('storage', function (event) {
        if (event.key !== sessionKey && event.key !== usersKey && event.key !== null) return;
        var user = CodeQuizAuth.current();
        var nextUserId = user ? user.id : null;
        if (nextUserId === activeUserId) return;
        activeUserId = nextUserId;
        location.reload();
    });
}());
