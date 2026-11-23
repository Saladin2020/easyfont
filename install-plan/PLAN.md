# Easy Font studio install plan (prepared, NOT applied)

Nothing below has been run against `/workspace/indie-studio`. Apply only after the user approves.

1. `git clone /workspace/easy-new/easyfont /workspace/indie-studio/tools/easyfont && cd $_ && git checkout --detach <SHA>`
2. `npm ci && npm run build && npm test` (expect all tests passing, Godot test skipped; `GODOT=… npx vitest run test/godot.test.ts` for the Godot check).
3. Copy `install-plan/easyfont-cli.mjs` → `/workspace/indie-studio/tools/easyfont-cli.mjs` (same shape as the other
   `easy*-cli.mjs` wrappers: sets `EASYFONT_HOME`, `EASYFONT_WORKSPACE`, adds `/workspace/indie-studio/projects` to
   `EASYFONT_ALLOWED_DIRS`).
4. Copy `install-plan/EASYFONT.md` → `/workspace/indie-studio/tools/EASYFONT.md` and replace `<SHA>`.
5. Smoke: `node /workspace/indie-studio/tools/easyfont-cli.mjs init --workspace /workspace/indie-studio/projects/_smoke_font`
   then `check` and `export --preset godot` with the same `--workspace`.
6. Shared skill: install `SKILL.draft.md` as `easyfont-combat` (the parent agent does this).
7. Once a GitHub repo exists (user's call): `git remote add github https://github.com/Saladin2020/easyfont.git` in the install.

Ports: editor 8948, MCP HTTP 8949, Vite 5194.
