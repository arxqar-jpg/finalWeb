# Final rubric implementation map

| Requirement | Implementation / evidence |
|---|---|
| At least 6 connected functional pages | Overview, Quizzes, Study Lab, About, Contacts, Profile. Each page links to all six through main navigation. |
| Responsive layout (10) | Bootstrap grid, Flexbox and CSS Grid; mobile navigation; readable stacked forms and cards. Tested at 320, 360, 390, 768, 992 and 1440 px. |
| Hosting (5) | Static-host-compatible source and deployment instructions. Actual final publication and live/repository URLs must be verified before submission; localhost is not hosting. |
| Light/Dark (5) | Accessible switch in every header; persistent localStorage value; theme-aware controls, cards, code and validation errors. |
| Design/UX (20) | Existing Forest visual identity, local imagery/icons/fonts, consistent navigation and spacing; explicit beginner-programming purpose. |
| Authentication simulation | js/auth.js: localStorage registration, case-normalized duplicate-email check, credential comparison, session, redirect to Profile, displayed details and logout. |
| Form validation | js/script.js: required fields, email, password length/complexity, confirmation, international phone, names, message length and consent. Inline errors and aria-invalid. Forms use novalidate; no required/pattern/minlength/maxlength/min/max/type=email validation attributes. |
| Search/filter | js/study.js: dynamic topic cards, literal highlighting, category filtering, keyboard suggestions and saved filter state. |
| Animated UI (5) | Button transitions, theme switch, modal/accordion effects, counters, progress, feedback spinner, gallery transitions; prefers-reduced-motion supported. |
| External public API (10) | js/resources.js: direct requests to api.github.com/repos/... for three relevant learning repositories; async/await, loading, response validation, timeout, errors, Retry and labeled cache fallback. |
| Cohesion (10) | Quiz → explanation → missed-question practice → study plan → learning resources; local account keeps individual progress together. |
| Presentation (5) | PRESENTATION-KZ.md supports preparation; the team must demonstrate and explain the code in person and follow the actual presentation time limit. |
| Code organization (5) | Six root HTML pages; css/js/data/images/vendor/audio folders; shared account dialog; separate storage, authentication, quiz and API files; meaningful checks and browser tests. |

The quiz engine has three topics with six questions each. It supports navigation, review flags, incomplete-answer checks, grading, explanations, missed-question practice, persistent drafts and the latest 30 saved results. These functions extend the existing team project; no AI feature or unrelated service is added.

Form validation applies to the fields actually present in a form. A quiz answer form or study-topic selector does not ask for unrelated email/password/phone details.

Contact feedback is a clearly labeled browser-local simulation. The site does not claim that an email was sent. Authentication is also the localStorage simulation required by the assignment.

Tests verify behavior; they do not guarantee an instructor's mark, public hosting status or presentation performance.
