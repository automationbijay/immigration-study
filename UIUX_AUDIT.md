# UI/UX Audit & Improvement Plan — Migration Assistant

**Date:** 2026-08-05
**Scope:** `web-app/src/` — 16 files, ~3,360 lines.
**Stack:** React 19 + Vite 8 + react-router 7 + Supabase, hand-rolled CSS with design tokens in `web-app/src/index.css`.

A design system exists at `web-app/design-system/migration-assistant/MASTER.md` but the app has drifted from it.

---

## 1. Broken things a user actually sees

These are visible defects, not style preferences. Fix these first.

| # | Issue | Location |
|---|---|---|
| 1 | **News dates are invisible.** `color: var(--color-muted)` — but `--color-muted` is `#E8ECF0`, a *background* token. On white that's ~1.15:1 contrast. Same bug on the FormsHub loading text. | `pages/Discover.jsx:257`, `pages/NewsHub.jsx:62`, `pages/FormsHub.jsx:102` |
| 2 | **Dropdowns show the wrong selection.** Duplicate `value` attributes: age has `25` twice (18–24 *and* 33–39), education has `10` twice, partner skills has `10` twice. A 35-year-old always sees "18 – 24 years" selected. | `components/PointsForm.jsx:24-31`, `:77-84`, `:126-131` |
| 3 | **Toggle switches don't exist.** `.switch` / `.slider` classes are used 6× but never defined in CSS — they render as plain checkboxes beside empty spans. | `components/PointsForm.jsx:89-92` vs `index.css` |
| 4 | **Saving in the Calculator corrupts your Profile.** Profile writes `overseasExp`/`ausExp` as **years**; Calculator writes the same columns as **points**. Save once and "5 years" becomes "10 years". | `pages/Calculator.jsx:147-149` vs `pages/Profile.jsx:668-672` |
| 5 | **Profile modal closes on failure.** `handleModalSave` reads the *stale* `message` state right after `await updateProfile()` — React hasn't re-rendered, so it always sees the old value and closes. | `pages/Profile.jsx:350-356` |
| 6 | **Success/error messages are invisible.** `message` renders at the top of the page, underneath the modal overlay that's showing when you save. | `pages/Profile.jsx:379` |
| 7 | **iOS safe-area padding never applies.** Bottom nav uses `env(safe-area-inset-bottom)` but `index.html` lacks `viewport-fit=cover`, so the inset resolves to `0` and the nav sits under the home indicator. | `index.css:84` vs `index.html:6` |
| 8 | **Landing CTA makes a promise nothing keeps.** "Upload CV" → `/signup?intent=upload_cv`; Signup never reads `intent` and drops you at `/login`. | `pages/Landing.jsx:29` vs `pages/Signup.jsx` |
| 9 | **No 404 route.** Any unknown path renders an empty `<main>`. | `App.jsx:79-89` |
| 10 | **Gradient headline can render invisible.** `-webkit-text-fill-color: transparent` with no `@supports` guard or fallback color. | `index.css:731-736` |

---

## 2. Structural UX problems

### Home is a dead end
`pages/Home.jsx` is 36 lines of "Welcome, {name}! 👋" with zero actions. It's the post-login destination and the first nav tab — the single most-visited screen in the app does nothing. Meanwhile the product's core value (your points score) is **three taps deep**: Home → Discover → card → Calculator.

### Navigation doesn't match the app
3 nav tabs for 7 routes. Calculator, Forms, and News are unreachable from the nav. The active tab is signalled by colour alone (`.nav-item.active` changes only `color`) — fails WCAG 1.4.1 — and the rule is written as `.nav-item.active, .nav-item:active`, which conflates "current page" with "finger down".

### No sense of place
The header is a hardcoded `<h1>Migration Assistant</h1>` on every screen. Sub-pages compensate with ad-hoc "← Back to Discover" links, which are wrong if you arrived any other way.

### Profile is six identical grey rectangles
Every section shows the same chevron and reveals nothing — no completion state, no summary of what's filled in, no indication that Basic Details is empty while Language has three tests. The chevrons are `ChevronDown` rotated `-90deg` (so, pointing right) and static, implying accordion behaviour that never happens — they open a full-screen modal instead.

### The layout fights itself
`.main-content` caps width at 600px with 1rem padding; then Discover/Calculator/FormsHub/NewsHub each set `maxWidth: 800px, padding: 2rem` inside it. The 800px is dead, and the padding stacks to **3rem horizontal on a 375px phone → 279px of usable width**. Bottom padding is compensated twice too (`app-layout: 70px` + page `100px`).

### Loading is four different bare "Loading..." strings
Each with its own inline flexbox. No skeletons, so every screen flashes empty → jumps to full content.

---

## 3. Accessibility

- **Modals**: no `role="dialog"`, no `aria-modal`, no focus trap, no Escape-to-close, no focus restore, no body scroll lock. Two modal patterns coexist (bottom-sheet in `index.css:441`, centred override in `components/CvUploadModal.jsx:48`), and CvUploadModal stacks a second overlay on top of the first.
- **Six clickable `<div>`s** in Profile with no `role`, `tabIndex`, or key handler — the entire Profile screen is keyboard-inaccessible. Same for every card in Discover/FormsHub/NewsHub.
- **No `:focus-visible` styles** on buttons, links, or nav — only inputs get a ring.
- **Hover-only affordances via JS**: `onMouseOver`/`onMouseOut` mutating `currentTarget.style` (`pages/Profile.jsx:54-55`, `components/CvUploadModal.jsx:84-85`) — no keyboard or touch equivalent.
- **No `prefers-reduced-motion`** despite an animated score counter, slide-up modals, and hover translations.
- **Images** have no `width`/`height` (CLS on every Unsplash load), no `loading="lazy"`, no error fallback.
- `components/OccupationSearch.jsx` is the one genuinely well-built component here — proper combobox roles, `aria-activedescendant`, keyboard nav, race-condition guard. **Use it as the quality bar for everything else.**

---

## 4. Design-system drift

- **~170 inline `style={{}}` objects**, 66 in `pages/Profile.jsx` alone. Tokens exist and are bypassed.
- **Undefined tokens in use**: `--color-text` (5×), `--color-bg` (1×) — silently fall back to inherited values.
- **Hardcoded hexes**: `#16a34a`, `#dc2626`, `#15803d`, `#b91c1c`, `#f8fafc` — the success/danger palette lives in JSX, not tokens. `rgba(161, 98, 7, 0.1)` is repeated 8×.
- **No type scale**: 0.75 / 0.8125 / 0.875 / 1 / 1.1 / 1.125 / 1.25 / 1.5 / 2.5 / 3rem, all set inline.
- **Conflicting success colour**: the score ring turns green `#16a34a`, the "Eligible" pill turns gold `--color-accent`. Same state, two colours.
- **Drift from MASTER.md**: spec says primary buttons are accent gold `#A16207`; the app ships them near-black `#171717`. Spec defines `--shadow-sm/md/lg/xl`; none exist in CSS — shadows are hand-written rgba each time. Spec defines `--space-*`; CSS defines `--spacing-*`.
- **Points logic duplicated 3×** (`Discover:32-80`, `FormsHub:31-79`, `Calculator:46-127`) with divergent, partly-unreachable branches (`else if (osExp > 15)` after `if (osExp >= 8)` can never run).
- **Dead code**: `App.css` (184 lines of Vite template, never imported), `handleLogout` + `LogOut` import in `App.jsx:65` (defined, never used), `ChevronUp` in Profile, all three files in `src/assets/`, duplicate `marital_status`/`phone_no` keys in `pages/Profile.jsx:113-116`.
- `index.html` `<title>` is still **"web-app"**; no meta description, theme-color, or OG tags.

---

## Improvement plan

### Phase 1 — Stop the bleeding (~half a day)
Visible defects, no redesign required.

1. Fix the three `--color-muted`-as-text-colour uses → `--color-secondary`.
2. Deduplicate every `<option value>` in PointsForm — give each band a unique value (`"25a"`/`"25b"` or an id) and map to points on read.
3. Write the missing `.switch` / `.slider` CSS, or replace with the existing `.checkbox-label` pattern.
4. Pick one unit for `overseasExp`/`ausExp` (recommend: **store years**, derive points) and make Calculator's save honour it.
5. Return a result from `updateProfile()` and branch on that, not on stale `message` state.
6. Render the save toast *inside* the modal, or as a fixed-position toast above `z-index: 100`.
7. Add `viewport-fit=cover`; set a real `<title>` + meta description.
8. Add a 404 route and a `@supports`/fallback colour for `.text-gradient`.
9. Make Signup honour `?intent=upload_cv` — or drop the param from the CTA.

### Phase 2 — Design-system consolidation (~1 day)
No visual redesign; move styling out of JSX so Phase 3 is cheap.

10. Extend tokens in `index.css`: add `--color-success/-bg`, `--color-danger/-bg`, `--color-accent-subtle` (replaces the 8× `rgba(161,98,7,.1)`), `--shadow-sm/md/lg/xl`, and a type scale `--text-xs…--text-4xl`. Alias `--color-text`/`--color-bg` or delete the usages. Reconcile `--spacing-*` vs the spec's `--space-*`.
11. Extract shared components: `<Card>`, `<PageHeader>` (title + optional back), `<Section>`, `<Toast>`, `<Skeleton>`, `<Modal>` (one implementation, sheet on mobile / centred on desktop).
12. Delete dead code: `App.css`, `src/assets/*`, `handleLogout`, unused imports, duplicate object keys.
13. Extract points calculation into `src/lib/points.js` — one function, used by all three call sites. This is the fix that makes the score consistent everywhere.
14. Fix the layout conflict: let `.main-content` own width and padding; strip `maxWidth`/`padding`/`paddingBottom` from the four page containers. Widen `.main-content` to ~760px on desktop.

### Phase 3 — Accessibility pass (~1 day)

15. One accessible `<Modal>`: `role="dialog"`, `aria-modal`, focus trap, Escape, focus restore, `overflow: hidden` on body. Migrate both call sites.
16. Convert every clickable `<div>` to `<button>` or `<Link>` (Profile sections, all cards).
17. Global `:focus-visible` ring using `--color-ring`.
18. Give `.nav-item.active` a non-colour indicator (top bar or filled icon) + `aria-current="page"`; split the `:active` selector out.
19. Add `@media (prefers-reduced-motion: reduce)` to kill the count-up, slide-up, and hover transforms.
20. `width`/`height`/`loading="lazy"` on all images; replace the JS hover handlers with CSS `:hover, :focus-within`.

### Phase 4 — The actual UX redesign (~2–3 days)
This is where the product improves, and it depends on Phases 1–2.

21. **Rebuild Home as the dashboard.** Score ring + eligibility verdict at the top, a "complete your profile" progress meter driven by which fields are actually filled, the single highest-impact next action ("Add your English test → +20 pts"), and recent news. Home becomes the answer to "am I eligible?", which is why people opened the app.
22. **Rework navigation.** Either 4 tabs (Home / Calculator / Discover / Profile) promoting the calculator to first-class, or keep 3 and put a persistent score chip in the header that deep-links to it. Give the header a per-route title so back-links become redundant.
23. **Rebuild the Profile list** as summary rows: section name, filled/empty state, one-line preview of the value, and points contributed. Turn each row into a `<button>`. Consider replacing modals with routed sub-pages (`/profile/language`) — better back-button behaviour on mobile and no focus-trap complexity.
24. **Make the calculator explain itself.** Show a per-category points breakdown next to the ring (the `.breakdown-row` CSS is already written and unused), and mark which values came from the profile vs. were tweaked here. State clearly that the +5 state nomination is an assumption, not a guarantee.
25. **Skeleton loaders** on Home, Discover, Profile, Calculator.
26. **Replace the dummy news array** with a real source, or label it "Sample content" — three hardcoded articles duplicated across two files currently read as live data.
27. **Empty and error states**: what Discover looks like with no profile yet, what happens when Supabase is unreachable. Right now failures are `console.error` and a silent zero.

---

## Sequencing note

Phases 1 and 2 are safe to run in either order, but **do 2 before 4** — redesigning on top of 170 inline style objects means rewriting the same screens twice. Phase 3's modal work (item 15) also unblocks the routed-sub-page decision in item 23, so consider deciding that first.

The fastest visible win is Phase 1 alone: nine small fixes that take the app from "visibly buggy" to "looks intentional."
