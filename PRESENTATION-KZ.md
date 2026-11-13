# CodeQuiz — қорғауға дайындық

Team Spirit: Darkhan Saduakasov және Kassymkhan, SE 2508.

Мақсат: бағдарламалауды енді үйреніп жүрген студенттерге Java, Python және HTML/CSS бойынша қысқа quiz арқылы жаттығуға көмектесу. Қате жауаптан кейін түсіндірме мен келесі оқу қадамын көрсету.

Бағалау: Final рубрикасында Overall Presentation — 5/100 балл. Presentation Guideline бойынша максимум 5 минут; мақсат 4:30–5:00. Әр артық 30 секунд үшін −2 балл. Екі қатысушы да сөйлеуі немесе демонстрация жасауы керек.

## Көрсететін ағын

1. Алты navigation бетін көрсетіңдер. Телефон еніне ауыстырып, menu мен responsive layout-ты көрсетіңдер.
2. Light/Dark ауыстырыңдар; басқа бетке өтіп, сақталғанын көрсетіңдер.
3. Sign Up бос тұрғанда inline errors көрсетіңдер. Қате email/phone және әлсіз password қабылданбайтынын көрсетіңдер.
4. Практикалық аккаунт құрыңдар. Қате парольмен Log In істемейтінін, дұрыс парольмен Profile ашылатынын көрсетіңдер. Profile-де name/email/phone көрінеді.
5. Quiz өтіңдер: жауапты таңдау, review flag, draft-ты refresh-тен кейін жалғастыру, score/explanations және missed-question practice.
6. Overview-та search/filter, Study Lab-та жоспар жасау және GitHub API ресурстарының жүктелуін көрсетіңдер.
7. Code-тан fetch/async-await және loading/error/retry логикасын қысқаша түсіндіріңдер. Соңында нақты live/repository сілтемелерін көрсетіңдер.

Тайминг: 0:00–0:35 таныстыру, топ, мақсат және аудитория; 0:35–1:20 responsive, modes және design; 1:20–2:30 validation, registration, login және Profile; 2:30–3:35 quiz, results және search; 3:35–4:20 planner және API; 4:20–4:50 негізгі артықшылықтар, болашақ жақсарту және алғыс. Kassymkhan таныстыру мен interface-ті, Darkhan quiz/API-ді көрсетеді; қорытындыға екеуі де қатысады. Бұл — дайындық жоспары.

Кодты live өзгертпеңдер. Байланыс үзілсе көрсету үшін PDF-тегі screenshots немесе қысқа video demo дайындаңдар. Болашақ жақсарту мысалы: backend accounts және көбірек quiz сұрақтары.

## Moodle-ға тапсыру

Екеуің де FINAL EXAM FOLDER-ға үш файлды бірге, жеке аккаунттарыңнан тапсырасыңдар:

- CodeQuiz_SE2508_FinalProject.zip
- CodeQuiz_SE2508_Report.pdf
- CodeQuiz_SE2508_Links.txt

Guideline report үшін PDF only деп нақты жазады; naming example ішіндегі .docx-ты қолданбаңдар. Қате формат, жетіспейтін файл немесе жеке тапсырмау үшін −30 балл көрсетілген. Links.txt ішінде repository мен live URL екеуі де болуы керек.

## Қай кодты білу керек

- `js/auth.js`: users массиві, duplicate email, login password comparison, session user ID, profile rendering, logout.
- `js/script.js`: form submit → preventDefault → әр өрісті JS-пен тексеру → inline error → жарамды деректі сақтау.
- `js/storage.js`: localStorage string сақтайды; JSON.stringify/parse; account бойынша жеке progress; unavailable storage кезінде memory fallback.
- `js/quiz-app.js`: question state, answer index, correct answers, result calculation, draft/history.
- `js/study.js`: массивті filter арқылы іздеу, cards render, plan қадамдары және сақтау.
- `js/resources.js`: сыртқы GitHub API → response.ok → JSON → schema check → DOM; timeout/error/retry/cache.
- `css/layout.css`, `css/final.css`: grid/flex, media queries, theme variables, dark error colors.

## Жиі қойылатын сұрақтар

**Backend бар ма?** Жоқ. server.cjs локал preview үшін статикалық файлдарды береді. Аккаунт талап бойынша браузердің localStorage-інде симуляцияланады. Hosted нұсқаны static hosting аша алады.

**Quiz JSON external API ме?** Жоқ. Ол өз сұрақ банкіміз. External API — Study Lab-тағы `https://api.github.com/repos/...` сұраулары.

**Пароль қауіпсіз production жүйесі ме?** Жоқ. Бұл rubric сұраған localStorage simulation; тек практика паролін қолданамыз. Нағыз аккаунт жүйесіне backend қажет.

**API істемесе не болады?** Loading біткен соң error және Retry шығады. Бұрын сақталған дерек болса, saved cache екені көрсетіледі. Quiz жергілікті сұрақтармен жұмысын жалғастырады.

**localhost жеткілікті ме?** Жоқ. Тапсыру үшін финал нұсқасын онлайн жариялап, live және repository URL беру керек.

**Contact не істейді?** Деректі JavaScript тексереді және feedback-ті осы браузерге сақтайды. Email жіберілді деп жалған хабарлама көрсетілмейді.

## Бөлісу

Бұрынғы team roles-ты негізге алыңдар: Kassymkhan About/Contacts, modal/theme/form UI-ды; Darkhan quiz/search/data/storage логикасын түсіндіре алады. Екеуің де account және external API ағынын түсініп барыңдар.
