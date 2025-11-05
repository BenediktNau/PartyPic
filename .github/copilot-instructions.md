<!--
This file guides AI coding agents (Copilot-like assistants) to be productive in the PartyPic repo.
Keep this short and concrete: point to the architecture, key files, dev workflows and examples of patterns.
-->

# PartyPic — Copilot instructions (concise)

Quick orientation
- This repository contains two main folders: `party-pic_client` (React + Vite + TypeScript) and `party-pic_server` (NestJS)
- Client is a Vite app: entry at `party-pic_client/src/main.tsx`. The camera UI lives in `party-pic_client/src/views/camera.view.tsx` and the webcam wrapper at `party-pic_client/src/components/camera/Webcam.comp.tsx`.
- Server is a standard NestJS app: entry at `party-pic_server/src/main.ts`, DI modules in `app.module.ts`, and basic controller in `app.controller.ts`.

How to run (developer commands)
- Client: from `party-pic_client` run `npm install` then `npm run dev` to start Vite (HMR). Build with `npm run build` (this runs `tsc -b` then `vite build`).
- Server: from `party-pic_server` run `npm install` then `npm run start:dev` for watch mode. Production run is `npm run start:prod` after building.

Project-specific patterns to follow
- Typescript-first: both sides use TypeScript and expect proper module imports. Client tsconfig files live at `party-pic_client/tsconfig.*.json`.
- Minimal API surface: the server currently exposes a default GET `/` in `party-pic_server/src/app.controller.ts`. When adding endpoints, keep controllers in `party-pic_server/src/` and use NestJS providers/services.
- Client components: prefer small functional components. Example: `Webcam.comp.tsx` uses `react-webcam` and forwards a `ref` prop (see that file for screenshot/capture patterns).

Integration notes & examples
- Upload and persistence: There is no explicit upload implementation in the repo. If you add file upload endpoints, prefer multipart/form-data on the server and store files in `uploads/` (create if needed). Use NestJS `@Controller()` with `@Post()` and `@UseInterceptors(FileInterceptor(...))`.
- Client-to-server calls: there is no consolidated `api/index.ts`. If you add one, place it at `party-pic_client/src/api/index.ts` and export thin wrappers around `fetch` or `axios`. Example usage: call `POST /photos` with FormData containing `file` and metadata.

Testing and linting
- Server uses Jest (see `party-pic_server/package.json` scripts). Run unit tests with `npm run test` in `party-pic_server`.
- Client uses ESLint; run `npm run lint` in `party-pic_client`.

Conventions and assumptions
- Keep UI responsibilities in `party-pic_client/src/views` and reusable pieces in `party-pic_client/src/components`.
- Match existing file naming: .tsx for React components, .ts for Node server files.
- Keep dependency additions minimal and standard (React, NestJS built-ins). Document new scripts in the respective `package.json`.

Where to look for examples
- Camera capture and screenshot example: `party-pic_client/src/components/camera/Webcam.comp.tsx` and `party-pic_client/src/views/camera.view.tsx`.
- Server bootstrap and listen port: `party-pic_server/src/main.ts`.

If you need to modify architecture
- Small changes: add files under their respective folders and export from an `index.ts` where appropriate.
- Large changes (new services, persistent storage): propose a short plan in the PR description explaining why and how it affects client-server contracts.

What *not* to do
- Don't assume an existing API surface beyond `GET /` on the server. Search before calling endpoints.
- Don't introduce global side-effects in shared files; keep server-only code under `party-pic_server/`.

Feedback
- If anything here is out-of-date or missing, open a short PR or reply with specifics (I will iterate on this file).
