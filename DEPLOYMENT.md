# Publish the final version

Repository: https://github.com/arxqar-jpg/finalWeb

Live website: https://arxqar-jpg.github.io/finalWeb/

Use the following steps when updating GitHub Pages. Downloading the ZIP does not update the hosted website.

## GitHub Pages

1. Open the team's repository: https://github.com/arxqar-jpg/finalWeb
2. Upload/commit the contents of `CodeQuiz-Final` to the repository root. Upload the actual files and subfolders, not only the ZIP or a nested folder. Preserve `index.html` at the root and include all six HTML pages, `css`, `js`, `data`, `images`, `vendor` and `audio`.
3. In repository Settings → Pages, select the intended publishing branch and root directory. Wait for GitHub Pages to finish publishing.
4. Open https://arxqar-jpg.github.io/finalWeb/ and confirm the final Profile navigation and Light/Dark switch appear.
5. Open Profile, create a practice account, log in, complete a quiz and check the saved result. Open Study Lab and confirm GitHub resources load. Refresh each of the six page URLs directly.
6. Check mobile layout and both themes, then submit the verified live URL and repository URL together with the requested ZIP.

## Netlify alternative

Deploy the directory containing `index.html` and all assets. This is a static website with no build step. The included `netlify.toml` sets publish directory `.` and an empty build command. Keep a GitHub repository link for the source submission even when hosting on Netlify.

## Static hosting behavior

- The hosted quiz reads `data/questions.json` directly, relative to the current project directory. Repository subpaths are supported.
- `server.cjs` is only a local preview convenience; it is not needed on GitHub Pages or Netlify.
- The GitHub resource API is public and needs no private token. Network failure or public rate limiting shows an inline message and Retry.
- Accounts, sessions and progress are per browser **and origin**. A local practice account does not automatically transfer to a different hosted domain.

Check the published version after every update; GitHub Pages may take a few minutes to deploy a new commit.
