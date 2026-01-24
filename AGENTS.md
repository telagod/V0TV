# Repository Guidelines

## Project Structure

- `src/app/`: Next.js App Router routes (UI + server). Pages live in `*/page.tsx`; API handlers live in `api/*/route.ts`.
- `src/components/`: Reusable React components (UI + feature components).
- `src/lib/`: Shared utilities (config, storage adapters, DB clients, request helpers).
- `public/`: Static assets (icons, images, `logo.svg`).
- `scripts/`: Build/deploy helpers (config conversion, manifest generation, Cloudflare automation).
- `docs/` and `deploy/`: Developer docs and deployment guides (Docker/Cloudflare/Vercel/Railway/VPS).

## Build, Test, and Development Commands

Use `pnpm` (see `package.json#packageManager`). Recommended Node version is in `.nvmrc`.

- `pnpm dev`: Generates runtime config + manifest, then runs `next dev`.
- `pnpm build`: Generates password/runtime/manifest, then runs `next build`.
- `pnpm start`: Runs the production server (`next start`) after a build.
- `pnpm lint` / `pnpm lint:fix`: ESLint checks / auto-fixes `src/` then formats.
- `pnpm typecheck`: TypeScript type check (`tsc --noEmit`).
- `pnpm format` / `pnpm format:check`: Prettier write / verify.
- Cloudflare Pages: `pnpm pages:build` (outputs to `.open-next`), `pnpm preview`, `pnpm cf:dev`, `pnpm cf:deploy`.

## Coding Style & Naming

- TypeScript + React (`.ts`/`.tsx`) with `strict: true` (`tsconfig.json`).
- Formatting: Prettier (`tabWidth: 2`, `singleQuote: true`, `semi: true`).
- Linting: ESLint (`next/core-web-vitals`) + `simple-import-sort`.
- Paths: use `@/…` for `src/*` and `~/…` for `public/*`.
- Components: PascalCase filenames (e.g. `src/components/VideoCard.tsx`).

## Testing Guidelines

`package.json` includes `pnpm test`/`pnpm test:watch`, but there is no Jest binary configured in this repo yet. For now, rely on `pnpm lint`, `pnpm typecheck`, and `pnpm build`, and prefer adding tests alongside new logic as `*.test.ts(x)` when the test harness is introduced.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (examples: `feat: …`, `fix: …`, `refactor(player): …`).
- PR titles are validated in CI (allowed types include `feat`, `fix`, `docs`, `refactor`, `chore`, etc.).
- PRs should include: what/why, testing notes (commands run), and screenshots for UI changes.

## Configuration & Secrets

- Runtime config is sourced from `config.json` and generated into `src/lib/runtime.ts` via `pnpm gen:runtime` (the generated file is gitignored).
- Never commit secrets or generated credentials (`PASSWORD.txt`, `.env*.local`, `video-sources.json` are gitignored). Use `config.example.json` as a template.
