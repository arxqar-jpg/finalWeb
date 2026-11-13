# CodeQuiz — Final Project

Team Spirit · Darkhan Saduakasov & Kassymkhan · SE 2508

CodeQuiz helps beginner programmers practise Java, Python and HTML/CSS through short code-reading quizzes, answer explanations and a personal study plan.

## Open locally

Install Node.js if needed, extract the complete folder, then open `START.bat` or run:

```sh
npm start
```

Open **http://127.0.0.1:4173/**. Keep the terminal open. No package installation or API key is needed to run the website. Use HTTP rather than double-clicking an HTML file because the quiz uses Fetch.

The question bank, fonts, images, Bootstrap and jQuery are bundled locally. The external GitHub learning resources require an internet connection and have visible loading, error, retry and saved-cache states.

## Six connected pages

| Page | Purpose |
|---|---|
| index.html | Quiz library, live search/filter and progress overview |
| quiz.html | Java/Python/HTML-CSS quizzes, explanations, drafts and results |
| study.html | Study planner, practice library and public API learning resources |
| about.html | Project purpose, team roles and technologies |
| contact.html | Validated feedback saved locally with recent messages |
| profile.html | Stored account details, practice summary and logout |

## Accounts and validation

Sign up from any page. Enter a name, email, international phone number and matching password. Successful registration shows a confirmation and an explicit **Continue to Log in** button; it does not dismiss the dialog or change pages. Then log in with the same email/password; successful login opens Profile. Account names, emails, phone numbers and passwords are stored in localStorage as required by the coursework simulation. Use a practice password. This is not a production authentication service.

Passwords need 8–128 characters, uppercase, lowercase, a number and a symbol, with no whitespace. Phone numbers start with `+` and contain 10–15 digits; spaces, parentheses and hyphens are accepted. Email format, required fields, consent and text lengths are checked in JavaScript. Every form has `novalidate`; the prohibited native validation attributes are not used.

Profile shows the stored name, email, phone, join date and practice summary. Results, unfinished quizzes, practice plans and saved feedback are separated by account. Guests can also practise; guest results remain separate. Clearing browser storage removes local accounts and progress.

Feedback is saved on the current browser, not sent to a server or by email. The button and confirmation state this explicitly. No backend account or message service is implied.

## Themes, search and API

- The Light/Dark switch is keyboard accessible and uses localStorage across all pages.
- Search updates cards immediately, supports category filters and suggestions, and restores the saved search/filter after navigation or reload.
- Study Lab uses the **GitHub public REST API** to retrieve current descriptions, star counts and code-update dates for TheAlgorithms/Java, TheAlgorithms/Python and freeCodeCamp/freeCodeCamp. The cards link to the matching learning resources.
- Public API requests use Fetch and async/await, response checks, data validation and a 10-second timeout. A 30-minute browser cache reduces public rate-limit usage. Errors offer Retry; a saved response is identified when used offline.
- The quiz bank is a separate curated local JSON source; it is not presented as the external API integration.

API documentation: https://docs.github.com/en/rest/repos/repos#get-a-repository

## File organization

```text
CodeQuiz-Final/
├── index.html, quiz.html, study.html
├── about.html, contact.html, profile.html
├── css/       style, layout, study, effects, quiz and final styles
├── js/        validation, accounts, storage, quizzes and public API
├── data/      curated 18-question bank
├── images/    local photos and brand icons
├── vendor/    Bootstrap, jQuery, fonts and licenses
├── audio/     optional planner sound
├── tests/     browser regression and final requirement checks
├── tools/     dependency-free source checks
└── server.cjs local preview server only
```

## Verification

```sh
npm run check
```

Optional browser tests require the developer dependency Playwright and installed Google Chrome:

```sh
npm install
npm start
# In a second terminal:
npm test
```

`CODEQUIZ_PLAYWRIGHT_PATH` can point to an existing Playwright package; `CODEQUIZ_BASE_URL` selects a different preview URL. Tests use isolated contexts and do not populate the visitor's actual browser with test accounts. Results are written to `report/final/`.

## Publication and submission

Repository: https://github.com/arxqar-jpg/finalWeb

Live website: https://arxqar-jpg.github.io/finalWeb/

Each team member must submit these three files together in Moodle's FINAL EXAM FOLDER: `CodeQuiz_SE2508_FinalProject.zip`, `CodeQuiz_SE2508_Report.pdf` and `CodeQuiz_SE2508_Links.txt`. The report includes the team, goal, work division, main pages, functionality, design decisions and screenshots. The links file contains both URLs above. The guideline explicitly requires a PDF report; its `.docx` naming example conflicts with that rule.

See `DEPLOYMENT.md` when updating the hosted source. Verify all six direct page URLs and the account/quiz/API flows after each publication.

`REQUIREMENTS.md` maps implementation to the supplied rubric. `PRESENTATION-KZ.md` provides a concise demonstration and code explanation checklist. Presentation performance and the actual public deployment cannot be established by a ZIP alone.
