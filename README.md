# AI Personal Trainer MVP

Spanish-first iPhone Web MVP for personal hypertrophy training: generate a plan, execute every set in the gym, track pain/measurements, and suggest progression between sessions.

## Product focus

- Target platform first: iPhone-only responsive web app.
- Deferred: Apple Watch, native iOS/watchOS, offline sync, social/sharing, coach/admin workflows.
- Test users: three separate accounts/profiles for experienced recreational lifters training at a fully-equipped commercial gym.
- Primary goal: muscle growth and mobility for healthy aging.
- Secondary goal: fat loss as a side effect.
- Default language: Spanish.
- Secondary language: English.

## Local development

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Database migration commands load `DATABASE_URL` from `.env.local`:

```bash
npm run db:generate
npm run db:migrate
```

### iPhone local-network testing

To open `next dev` from an iPhone on the same Wi-Fi, allow the Mac's LAN host in `.env.local` and restart the dev server:

```env
NEXT_ALLOWED_DEV_ORIGINS="192.168.68.69"
```

Then run Next bound to the network interface:

```bash
npm run dev -- --hostname 0.0.0.0
```

Open `http://192.168.68.69:3000` on the iPhone. For Google login from the phone, `BETTER_AUTH_URL` and the Google OAuth redirect URL must match the host you are using. If Google does not accept a private LAN IP as a redirect URL, use a stable HTTPS preview/tunnel or production URL for interactive phone login.

## Planning docs

- [MVP plan](docs/product/mvp-plan.md)
- [Milestones](docs/product/milestones.md)
- [Data model](docs/architecture/data-model.md)
- [First features](docs/specs/first-features.md)
- [Generated plan contract](docs/specs/generated-plan-contract.md)
- [Progression rules](docs/product/progression-rules.md)
- [Session logging UX](docs/product/session-logging-ux.md)
- [Technical stack](docs/architecture/technical-stack.md)
- [Release workflow](docs/architecture/release-workflow.md)
- [Open questions](docs/product/open-questions.md)
- [Implementation log](docs/product/implementation-log.md)

## Success target

After two weeks of real gym use, each tester should be able to:

1. Generate or receive a 5-day, 60-minute hypertrophy plan.
2. Record every set with weight, reps, RIR, pain score, and notes.
3. See previous-session baselines.
4. Receive next-session progression suggestions.
5. Show at least one measurable 5% improvement signal where appropriate: volume, reps at same load, load, estimated performance, or asymmetry trend.
