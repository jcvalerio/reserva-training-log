# Next Task

Short and rolling: what is immediately next. **For where the project is and what constrains a new feature, read `docs/product/project-status.md` first.** For how any past decision was reached, `docs/product/implementation-log.md` is the source of truth.

## Status: plan editing unblocked — shipped and deployed.

**Editar mi plan** silently did nothing in production for whoever had a leftover draft, because a draft blocks the edit and nothing on any screen said so — `/plan` dropped the `?error=` on the floor, and the only route to the builder that could clear the draft was labelled "Crear mi propio plan". `/plan` now names the draft, links to it, and reports why the action failed; `/plan/historial/[planId]` no longer dead-ends on a draft.

Note for whoever hits something like this again: the discard button already existed at `/plan/builder` the whole time. The bug was navigation and silence, not capability — reaching that URL directly was the fix on the pre-deploy build.

Open decision: should **Editar mi plan** *adopt* an existing draft instead of refusing? Left as a refusal on purpose — auto-discarding someone's unfinished work to unstick a button is data loss, and adopting it is a product call. The refusal is at least visible now.

## Prior status: `setLog.painLocation` — shipped, deployed and committed (`5217545`).

Logging a set with pain above 0 now asks **where it hurts**: the seven joints, plus "Muscular (agujetas)" and "Otro". Below 0 pain nothing appears, so the normal flow is unchanged. `/progreso` states located pain plainly and marks older sets "(estimado)", since those can only be inferred from the joints an exercise loads.

Thresholds are untouched on purpose: pain > 2 still blocks aggressive progression even when it is ordinary soreness. Deciding whether that should change is what this column makes answerable — with evidence rather than a guess.

## Prior status: period views on Series por grupo muscular — shipped, deployed and committed (`4afb2d6`, `6fb8006`).

`/progreso`'s volume section now has four pills: **Esta semana · Semana pasada · 4 semanas · Todo**. "Semana pasada" exists because early in a week the current view is nearly empty and the averages smooth the last week away — there was no way to see how the week you just finished actually went. The multi-week views show the **average sets per week**, not a period total — a total sits several times above the weekly reference band and would read as healthy while you were undertrained. On the dev data, pecho reads 6 this week but averages 1.5/week against a 10–20 band; that gap is the reason the selector exists, and it is invisible from the weekly number alone. The body map follows the same period as the bars.

## Prior status: the exercise taxonomy and a rebuilt `/progreso` — shipped, deployed and committed (`bfdd8fb`).

**All five feedback items are now done in code.** Item 5 turned into something bigger than the original ask, because you reframed it: rather than only regrouping the dashboard, you decided to add the muscle-group taxonomy the project had declined twice before, so the app could produce real reports.

What that bought, in order of value:

1. **Series por grupo muscular** is the new headline on `/progreso` — weekly effective sets per muscle against a reference range. It's the number a coach actually reads for muscle gain, and crucially it's meaningful at *one* logged session per exercise, which is the data you actually have. The old blocker ("no exercise has two data points, so every trend line is a single dot") no longer decides what the page can show.
2. **The dropdown is gone.** Exercises are grouped by muscle group; tapping one opens the same progression chart as before. The chart was never your complaint, so it survives intact.
3. **Push:tirón and cuádriceps:femorales ratios**, and **pain grouped by joint** — the physio half. You log a pain score on every set and until now it was only ever visible per exercise.
4. The app can finally tell when a substitution changed the muscle worked. Your real swap — *Pantorrilla sentada unilateral* replacing *Press inclinado en máquina* — is exactly the case it couldn't see before.

**Your "Core" ×5 is now five specific exercises**, one per day, chosen against each day's load: Crunch en máquina (días 1 and 2), Pallof press en polea (día 3 — antirotation after the hinge day, instead of more loaded flexion), Elevación de rodillas en paralelas (día 4), Plancha lateral (día 5). Día 3's two logged sets get relabeled, which you approved.

**One honest consequence:** splitting Core removed the only exercise that had two completed instances, so until the rotation repeats, "Mejoras recientes" will be empty and every progression line is a single dot. The split revealed that rather than caused it — those two instances were never the same exercise — and it's exactly why weekly volume leads the page now.

**Now worth checking against your real production data**, since that's the whole point of shipping it: open `/progreso` on your phone and confirm the volume numbers, the body map, and the grouped exercise list read correctly for you — and ask Athletes B and C whether anything looks wrong in theirs, since the Core rename reached their plans too if those are clones of yours. Anything the catalog didn't recognise will show up in the visible "Sin clasificar" disclosure rather than failing quietly.

Note the production `DATABASE_URL` is now marked Sensitive in Vercel, so it can no longer be pulled for a direct `psql` check — the URL has to come from the Neon console if you want one.

**The dev database now contains synthetic history, deliberately kept.** Two prior weeks (Mon 2026-07-20 and Mon 2026-07-27, 7 sessions / 65 sets) were seeded so the week-over-week deltas and the per-exercise progression charts have something to render against — before it, everything was a single dot. **Every synthetic row has a `demo-seed-` id prefix**, nothing else was touched, and removal is one cascading statement:

```sql
DELETE FROM workout_session WHERE id LIKE 'demo-seed-%';
```

It exists **only on the Neon development branch**. Production has its own branch, so it does not and cannot travel with a deploy. Treat any `demo-seed-` row as scaffolding, never as real training history — the four real sessions are the ones without that prefix.

Migrations `0018`, `0019`, `0020` are applied to dev; production applies them automatically during the Vercel build. 29/29 of your prescriptions classify, none "Sin clasificar". `lint`/`typecheck`/`test` (396)/`build` all green.

## Up next

**Nothing is blocked or urgent.** All five user-feedback items and every milestone deliverable through M6 are shipped. Candidates, in rough order of value — the reasoning for each is in `project-status.md`:

1. ~~A `painLocation` column on `setLog`.~~ **Shipped 2026-08-09** (`5217545`). Logging pain above 0 now asks where, separating ordinary soreness from joint pain. It deliberately does not yet change the progression thresholds — **that is the next decision**, and it needs real logged pain to make responsibly. Every set to date carries pain 0.
2. **Use the dashboard for a few real weeks, then re-read the reference bands.** If the averages read as discouraging with genuine data, change the copy around the band rather than the numbers.
3. **Read what is already written**: `workoutSession.notes` and `musclePriority` are captured and never surfaced.
4. **M6's remaining acceptance** is field validation, not code: two weeks of real use per tester, friction documented, then the decision on web vs offline vs native.

Also open, user-side: check the raised text sizes and the ± stepper values on a real iPhone.

## Constraints that still apply

- No AI plan generation — plans are manual only (template catalog + builder). Not a gap to fill; it's the actual product direction now.
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
