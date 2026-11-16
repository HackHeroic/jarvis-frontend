# Jarvis — frontend

The web app for Jarvis, a personal intelligence that learns how one person works and has
things ready before they are asked. This repository is the Next.js 14 interface; the
backend is [Jarvis-Engine](https://github.com/HackHeroic/Jarvis-Engine), whose README maps
the whole project and its capstone documents.

## Running it

```bash
npm install
# create .env.local (see .env.local.example): the backend's URL and the user id
npm run dev
```

Start the backend first (port 8000), then open `http://localhost:3000/dashboard`.

## Pages

| Page | What it shows |
|---|---|
| `/dashboard` | The morning brief, what Jarvis noticed, and today |
| `/chat` | Talk to Jarvis: brain dumps become draft plans; optional Tutor mode teaches in short steps, uses hints and checks understanding |
| `/schedule` | The accepted plan by day, week and month |
| `/documents` | Uploaded files, opened in the viewer, and the tasks each is linked to |
| `/workspace/[taskId]` | One task: its criteria, study material and linked documents |
| `/habits` | The rules Jarvis has learned, with a spaced "Still how you work?" check-in |
| `/you` | What Jarvis knows about you, with the evidence and a forget button |

## Checks

```bash
npm test          # vitest
npm run lint
npx tsc --noEmit
```
