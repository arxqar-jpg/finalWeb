
document.addEventListener("DOMContentLoaded", function () {
    initClock();
    initTheme();
    initModal();
    initRegistration();
    initFAQ();
    initContact();
});
function initClock() {
    var clock = document.getElementById("current-date-time");
    if (!clock) return;

    function updateClock() {
        var now = new Date();
        clock.textContent = now.toLocaleString("en-US");
        clock.dateTime = now.toISOString();
    }

    updateClock();
    setInterval(updateClock, 1000);
}
function initTheme() {
    var button = document.getElementById("btn-change-bg");
    var names = ["forest", "midnight"];
    var labels = ["Light", "Dark"];
    var colours = ["#f5f5ef", "#111821"];
    var index = 0;
    if (!button) return;
    function applyTheme(name) {
        index = names.indexOf(name);
        if (index < 0) index = 0;
        document.body.setAttribute("data-theme", names[index]);
        document.body.style.backgroundColor = colours[index];
        document.getElementById("theme-name").textContent = labels[index];
        button.setAttribute("aria-label", "Dark mode");
        button.setAttribute("aria-checked", String(names[index] === "midnight"));
        try { localStorage.setItem("codequiz-theme", names[index]); } catch (error) {}
    }
    var saved = "forest";
    try { saved = localStorage.getItem("codequiz-theme") || saved; } catch (error) {}
    applyTheme(saved);
    button.onclick = function () { applyTheme(names[(index + 1) % names.length]); };
    var choices = document.querySelectorAll("[data-site-theme]");
    for (var i = 0; i < choices.length; i++) {
        choices[i].onclick = function () { applyTheme(this.getAttribute("data-site-theme")); };
    }
}
function initModal() {
    var modal = document.getElementById("custom-modal-overlay");
    if (!modal) return;

    var openButtons = document.querySelectorAll(".trigger-modal-btn");
    var tabs = modal.querySelectorAll(".modal-tab-btn");
    var panels = modal.querySelectorAll(".modal-tab-content");
    var previousButton = null;

    function showTab(name) {
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].getAttribute("data-tab") === name) {
                tabs[i].classList.add("active");
                tabs[i].setAttribute("aria-selected", "true");
                tabs[i].tabIndex = 0;
            } else {
                tabs[i].classList.remove("active");
                tabs[i].setAttribute("aria-selected", "false");
                tabs[i].tabIndex = -1;
            }
        }

        for (var j = 0; j < panels.length; j++) {
            if (panels[j].id === "tab-" + name) {
                panels[j].hidden = false;
                panels[j].classList.add("active");
            } else {
                panels[j].hidden = true;
                panels[j].classList.remove("active");
            }
        }
    }

    function closeModal() {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
        if (previousButton) previousButton.focus();
        modal.setAttribute("aria-hidden", "true");
        modal.setAttribute("inert", "");
    }

    for (var i = 0; i < openButtons.length; i++) {
        openButtons[i].onclick = function (event) {
            event.preventDefault();
            previousButton = this;
            var name = this.getAttribute("data-modal-tab");
            if (!name) name = "register";
            showTab(name);
            modal.removeAttribute("inert");
            modal.setAttribute("aria-hidden", "false");
            modal.classList.add("active");
            document.body.classList.add("modal-open");
            var firstControl = Array.from(modal.querySelectorAll(".modal-tab-content.active input, .modal-tab-content.active button")).find(function (control) { return control.offsetParent !== null; });
            if (firstControl) firstControl.focus();
        };
    }

    for (var j = 0; j < tabs.length; j++) {
        tabs[j].onclick = function () {
            showTab(this.getAttribute("data-tab"));
        };
        tabs[j].onkeydown = function (event) {
            var next;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                next = this === tabs[0] ? 1 : 0;
            } else if (event.key === "Home") {
                next = 0;
            } else if (event.key === "End") {
                next = tabs.length - 1;
            } else return;
            event.preventDefault();
            showTab(tabs[next].getAttribute("data-tab"));
            tabs[next].focus();
        };
    }

    document.getElementById("modal-close-btn").onclick = closeModal;
    // Keep entered details open when a click or text-selection drag reaches the backdrop.
    // The close button and Escape remain deliberate ways to leave the dialog.

    document.addEventListener("keydown", function (event) {
        if (!modal.classList.contains("active")) return;
        if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing) closeModal();
        if (event.key === "Tab") {
            var controls = modal.querySelectorAll("button, input");
            var visible = [];
            for (var k = 0; k < controls.length; k++) {
                if (controls[k].offsetParent !== null && controls[k].tabIndex >= 0) {
                    visible.push(controls[k]);
                }
            }
            if (visible.length === 0) return;
            var first = visible[0];
            var last = visible[visible.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
}
function initFAQ() {
    var buttons = document.querySelectorAll(".custom-accordion-header");

    function setAnswer(button, open) {
        var item = button.parentElement;
        var answer = item.querySelector(".custom-accordion-content");
        if (open) {
            item.classList.add("active");
            button.setAttribute("aria-expanded", "true");
            answer.setAttribute("aria-hidden", "false");
            answer.removeAttribute("inert");
            answer.style.maxHeight = answer.scrollHeight + "px";
        } else {
            item.classList.remove("active");
            button.setAttribute("aria-expanded", "false");
            answer.setAttribute("aria-hidden", "true");
            answer.setAttribute("inert", "");
            answer.style.maxHeight = "0px";
        }
    }

    for (var i = 0; i < buttons.length; i++) {
        setAnswer(buttons[i], false);
        buttons[i].onclick = function () {
            var wasOpen = this.getAttribute("aria-expanded") === "true";
            for (var j = 0; j < buttons.length; j++) {
                setAnswer(buttons[j], false);
            }
            if (!wasOpen) setAnswer(this, true);
        };
    }

    window.addEventListener("resize", function () {
        for (var j = 0; j < buttons.length; j++) {
            if (buttons[j].getAttribute("aria-expanded") === "true") {
                setAnswer(buttons[j], true);
            }
        }
    });
}
function showField(input, message) {
    var error = document.getElementById("err-" + input.id);
    error.textContent = message;
    if (message !== "") {
        input.classList.add("is-invalid");
        input.classList.remove("is-valid");
        input.setAttribute("aria-invalid", "true");
        error.style.display = "block";
        return false;
    }
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
    input.setAttribute("aria-invalid", "false");
    error.style.display = "none";
    return true;
}

function completeForm(form, boxId, message) {
    form.reset();
    var inputs = form.querySelectorAll("input, textarea");
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].classList.remove("is-valid", "is-invalid");
        inputs[i].removeAttribute("aria-invalid");
    }
    var errors = form.querySelectorAll(".error-msg, .invalid-feedback");
    for (var j = 0; j < errors.length; j++) {
        errors[j].textContent = "";
        errors[j].style.display = "none";
    }
    var box = document.getElementById(boxId);
    box.className = "alert alert-success mt-3";
    box.textContent = message;
}

function getNameError(value) {
    if (value.trim().length > 100) return "Use no more than 100 characters for your name.";
    var name = value.trim().toLowerCase();
    var letters = "abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюяәіңғүұқөһ";
    var count = 0;
    for (var i = 0; i < name.length; i++) {
        if (letters.indexOf(name[i]) !== -1) {
            count++;
        } else if (name[i] !== " " && name[i] !== "-" && name[i] !== "'" && name[i] !== "’") {
            return "Use letters, spaces, apostrophes or hyphens.";
        }
    }
    if (count < 2) return "Enter your name (at least two letters).";
    return "";
}

function getEmailError(value) {
    var email = value.trim();
    if (!email) return "Email is required.";
    if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/.test(email)) return "Enter an email such as name@domain.com.";
    var local = email.split("@")[0];
    if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || email.includes("..")) return "Check the dots and length in your email.";
    return "";
}

function getPhoneError(value) {
    if (!value.trim()) return "Phone number is required.";
    if (!/^\+[0-9 ()-]+$/.test(value.trim())) return "Start with + and a country code, for example +7 701 123 45 67.";
    var digits = value.replace(/\D/g, "");
    if (!/^[1-9][0-9]{9,14}$/.test(digits)) return "Use 10–15 digits including the country code.";
    return "";
}

function hasWhitespace(value) {
    var forbidden = [" ", "\t", "\n", "\r", "\v", "\f", "\u00a0", "\u1680", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a", "\u200b", "\u200c", "\u200d", "\u2028", "\u2029", "\u202f", "\u205f", "\u2060", "\u3000", "\ufeff"];
    for (var i = 0; i < value.length; i++) {
        if (forbidden.indexOf(value[i]) !== -1) return true;
    }
    return false;
}

function getPasswordError(value) {
    if (!value) return "Password is required.";
    if (hasWhitespace(value)) return "Password cannot contain spaces or invisible characters.";
    if (value.length < 8 || value.length > 128) return "Use a password between 8 and 128 characters.";
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) return "Include uppercase, lowercase, a number and a symbol.";
    return "";
}

function initRegistration() {
    var form = document.getElementById("registration-form");
    if (!form) return;
    var name = document.getElementById("reg-name");
    var email = document.getElementById("reg-email");
    var phone = document.getElementById("reg-phone");
    var password = document.getElementById("reg-password");
    var confirm = document.getElementById("reg-confirm-password");
    var terms = document.getElementById("reg-terms");
    function checkConfirmation() {
        return showField(confirm, !confirm.value ? "Confirm your password." : confirm.value !== password.value ? "Passwords do not match." : "");
    }
    name.oninput = function () { showField(name, getNameError(name.value)); };
    email.oninput = function () { showField(email, getEmailError(email.value)); };
    phone.oninput = function () { showField(phone, getPhoneError(phone.value)); };
    password.oninput = function () { showField(password, getPasswordError(password.value)); if (confirm.value) checkConfirmation(); };
    confirm.oninput = checkConfirmation;
    terms.onchange = function () { showField(terms, terms.checked ? "" : "Please confirm that you understand local account storage."); };
    form.onsubmit = function (event) {
        event.preventDefault();
        var checks = [showField(name, getNameError(name.value)), showField(email, getEmailError(email.value)),
            showField(phone, getPhoneError(phone.value)), showField(password, getPasswordError(password.value)),
            checkConfirmation(), showField(terms, terms.checked ? "" : "Please confirm that you understand local account storage.")];
        if (checks.includes(false)) { form.querySelector(".is-invalid").focus(); return; }
        var details = { name: name.value.trim(), email: email.value.trim().toLowerCase(), phone: "+" + phone.value.replace(/\D/g, ""), password: password.value };
        try {
            var error = CodeQuizAuth.register(details);
            if (error) { showField(email, error); email.focus(); return; }
        } catch (_) {
            var box = document.getElementById("reg-success-message");
            box.className = "alert alert-danger";
            box.textContent = "Your account could not be saved. Check browser storage permissions and try again.";
            return;
        }
        completeForm(form, "reg-success-message", "Account created. Continue to Log in to open your profile.");
        form.hidden = true;
        document.getElementById("login-email").value = details.email;
        var feedback = document.getElementById("login-feedback");
        feedback.className = "alert alert-success";
        feedback.textContent = "Account created. Log in to open your profile.";
        var continueButton = document.getElementById("registration-login-button");
        continueButton.hidden = false;
        continueButton.onclick = function () {
            document.getElementById("modal-tab-login").click();
            document.getElementById("login-password").focus();
        };
        continueButton.focus();
    };
}

function initContact() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var name = document.getElementById("user-name");
    var email = document.getElementById("user-email");
    var phone = document.getElementById("user-phone");
    var message = document.getElementById("user-message");
    var consent = document.getElementById("contact-consent");

    name.oninput = function () { showField(name, getNameError(name.value)); };
    email.oninput = function () { showField(email, getEmailError(email.value)); };
    phone.oninput = function () { showField(phone, getPhoneError(phone.value)); };
    message.oninput = function () {
        if (message.value.trim().length < 10 || message.value.trim().length > 2000) showField(message, "Write between 10 and 2000 characters.");
        else showField(message, "");
    };
    consent.onchange = function () {
        if (consent.checked) showField(consent, "");
        else showField(consent, "Please give your consent.");
    };
    form.addEventListener("input", function () {
        document.getElementById("contact-feedback").classList.add("d-none");
    });

    form.onsubmit = function (event) {
        event.preventDefault();
        var nameOK = showField(name, getNameError(name.value));
        var emailOK = showField(email, getEmailError(email.value));
        var phoneOK = showField(phone, getPhoneError(phone.value));
        var messageOK = false;
        var consentOK = false;
        if (message.value.trim().length >= 10 && message.value.trim().length <= 2000) messageOK = showField(message, "");
        else showField(message, "Write between 10 and 2000 characters.");
        if (consent.checked) consentOK = showField(consent, "");
        else showField(consent, "Please give your consent.");

        if (nameOK && emailOK && phoneOK && messageOK && consentOK) {
            var saved = CodeQuizStorage.read("feedback", []);
            if (!Array.isArray(saved)) saved = [];
            var entry = { name: name.value.trim(), email: email.value.trim().toLowerCase(), phone: "+" + phone.value.replace(/\D/g, ""), topic: document.getElementById("topic-select").value, message: message.value.trim(), date: new Date().toISOString() };
            if (!CodeQuizStorage.write("feedback", [entry].concat(saved).slice(0, 10))) {
                var box = document.getElementById("contact-feedback");
                box.className = "alert alert-danger"; box.textContent = "Your feedback could not be saved. Check browser storage permissions and try again.";
                return;
            }
            renderSavedFeedback();
            finishForm(form, "contact-feedback", "Thank you, " + name.value.trim() + ". Your feedback has been saved on this browser.");
        } else form.querySelector(".is-invalid").focus();
    };
}

$(document).ready(function () {
    renderSavedFeedback();
});

function renderSavedFeedback() {
    var list = document.getElementById("saved-feedback-list");
    if (!list) return;
    var saved = CodeQuizStorage.read("feedback", []);
    if (!Array.isArray(saved)) saved = [];
    list.replaceChildren();
    saved.filter(function (entry) { return entry && typeof entry.message === "string" && typeof entry.name === "string" && Number.isFinite(Date.parse(entry.date)); }).slice(0, 3).forEach(function (entry) {
        var item = document.createElement("li"); item.className = "mb-3";
        var title = document.createElement("strong"); title.textContent = entry.name + " · " + new Date(entry.date).toLocaleDateString("en-GB");
        var text = document.createElement("p"); text.className = "text-secondary mb-0 mt-1"; text.textContent = entry.message;
        item.append(title, text); list.append(item);
    });
    document.getElementById("saved-feedback").hidden = !list.children.length;
}
