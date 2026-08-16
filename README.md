 Welcome to our Lovable project

This project was built with [Lovable](https://lovable.dev).

## The App

EungUp is a social, gamified study platform targeted for university Engineering students, built around a mint-green bullfrog mascot named อึ่ง (Eung).
which has these features :
- **Study sessions** — Focus Mode with stopwatch, countdown, and task-focus timers and completed sessions reward Worms + XP.
- **Classes** — The main social container. Students create or join classes with invite codes, share tasks, and see class activity.
- **Tasks & Subjects** — Class-organized homework with due dates, submissions, and help requests.
- **Social Feed** — Milestones, shame posts, help requests, and battle results.
- **Leaderboards** — Class rankings.
- **Battle Mode** — Competitive study challenges where students bet memes and the winner takes the prize.
- **Gachapon** — Spend Worms to roll for rarity-based collectibles (memes, skins) with Epic pity at 20 and Legendary pity at 50.
- **Profile Hub** — Manage classes, view statistics, customize character, and adjust settings.
- **Streaks & Daily Goals** — To encourage consistent studying.

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
  

# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.
