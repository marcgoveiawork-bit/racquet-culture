# Racquet Culture app: handover prompt

Paste everything below into a new chat to carry on.

---

I'm Marc. With my cousins Caelan DaCosta and Surya N, I run **Racquet Culture**, a padel and pickleball club in Chicalim, Goa, India (1 padel court, 1 pickleball court). You built our community web app with me in an earlier chat. Please carry on from where we left off. Read `HANDOFF.md`, `SETUP.md`, `app.js`, `index.html` and `setup.sql` in the repo before changing anything.

## Where things live
- **Code:** GitHub repo `marcgoveiawork-bit/racquet-culture`, branch `main`. Files are at the repo root: `index.html` (markup and all CSS), `app.js` (all logic, about 1,700 lines), `config.js`, `setup.sql`, `SETUP.md`, `logo.png`, `logo-sm.png`, `icon-192.png`, `icon-512.png`.
- **Hosting:** GitHub Pages from `main` / root, at https://marcgoveiawork-bit.github.io/racquet-culture/. Pushing to `main` updates the live site within a minute or two. No Vercel.
- **Database:** Supabase project ref `snormmbkocezylbhzurh` (URL `https://snormmbkocezylbhzurh.supabase.co`). The publishable key is in `config.js` and is meant to be public.
- **Cloud environment:** the "Racquet Culture" Claude cloud environment allows `api.supabase.com`, `snormmbkocezylbhzurh.supabase.co` and `cdn.jsdelivr.net`. It has my Supabase personal access token saved as a network secret for `api.supabase.com`, so you can run SQL with the Management API (`POST https://api.supabase.com/v1/projects/snormmbkocezylbhzurh/database/query` with body `{"query": "..."}`). The token expires on the date I chose, so if it fails, ask me for a new one with the secure credential form, never in chat. `github.io` and Google Maps are blocked from the cloud environment, so the live site and the map can't be checked from there.
- **Old copy:** an older copy of the app sits in `naimbernard/Nai` under `racquet-culture/` on branch `claude/great-cori-wk4cmp`. That repo belongs to my collaborator Naim's JFM property app. Ignore that copy and don't touch the JFM files.

## Court booking moved to Hudle (Nov 2026)
The in-app booking system has been removed. Players book and pay on Hudle: https://hudle.in/venues/racquet-culture-chicalim/567082 (set in `config.js` as `hudle`). The app shows **Book on Hudle** buttons (home, the dock's Book tab, and a card under Our locations). Score entry still records the date, court and start and end time for admin tracking. The `rc_bookings` table is still in the database but the app no longer reads or writes it, and old booking invite messages are hidden.

## Database (all set up and live)
`setup.sql` has been run, and it's safe to re-run. Tables, all with row-level security:
- `rc_profiles`: id = auth user id, username, name, `data` jsonb holding the rest of the profile.
- `rc_matches`: `data` jsonb.
- `rc_confirmations`: a player confirming a score, or disputing it with their own score.
- `rc_bookings`: `day`, `start_slot` 0–35, `len`, `kind` `game` or `block`, `data`. An exclusion constraint stops overlapping bookings on the same court.
- `rc_messages`: the inbox. Each player only sees their own.
- `rc_admins`: only changed with SQL, never from the app.
- `rc_follows`.
- `rc_friend_requests`: pending, accepted or rejected. A 5-day wait after a rejection is enforced in a policy.

Helper functions: `rc_username_taken`, `rc_is_admin`, `rc_recently_rejected`, `rc_is_open`. Realtime is on for all tables. Signed-out (anon) users can't read any table.

Accounts: email and password sign-in through Supabase Auth. "Confirm email" is off because there's no email service yet. **MarcGoveia** is the only account and is an admin. Caelan and Surya still need to sign up, then be made admins:

```sql
insert into public.rc_admins (user_id) select id from public.rc_profiles where lower(username)=lower('USERNAME') on conflict do nothing;
```

## How the app works (key ideas in `app.js`)
- **Stores:** three stores share the same interface. `Live` (Supabase), `Local` (preview, saved in the browser), and `Demo` (in memory). `memStore()` provides Local and Demo.
- **State and rendering:** state lives in `S` (profiles, matches, bookings, confs, admins, msgs, follows, reqs, plus computed `R` levels, `D` level changes, `ST` score status). Views are built as HTML strings by `vHome`, `vBook`, `vAdd`, `vRank`, `vPlayers`, `vMe`, `vInbox` and `vSettings`, listed in `VIEWS`. Clicks are handled by `data-act` attributes that map to functions in `ACT`.
- **Levels:** padel runs 0.5–7 and pickleball 1.0–6.0.
  - **Starting level:** set from a Beginner/Intermediate/Expert choice and 5–6 questions per band (`QS`).
  - **Replay:** `rate()` replays every game in date order.
  - **Team strength:** each team is the average of its players' levels.
  - **Movement:** Elo-style changes, with a bonus for a bigger winning margin and faster movement in a player's first games.
  - **Disputed scores:** left out until an admin reviews them.
  - **Rankings:** three per sport, Beginner, Intermediate and Pro. Padel cut-offs are 2.5 and 4.5; pickleball 3.0 and 4.0.
- **Courts and time:**
  - Slots are 30 minutes, 6:00 am to midnight (`OPEN_H`, `CLOSE_H`, `NSLOT` = 36).
  - Players can book up to 3 hours (`MAX_GAME`).
  - Each sport has Court 1 only (`COURT_NOS`).
  - Prices: ₹900 per slot, ₹1,200 at peak from 5 pm (`PRICE`, `PEAK_FROM`). These are placeholders until I meet Caelan.
  - Location: one venue (`VENUES`, Chicalim, with a Google Maps link and an embedded satellite map).
  - **Everything runs on Indian Standard Time** (`IST`, `istParts`, `today()`, `slotDate()`, `nowSlot()`), whatever time zone the device is set to.
- **Scores:** players pick the date (a strip of day chips), the court, and the start and end time (`timeSheet`). The app refuses a time if another logged game uses that court, or if the slot is someone else's booking or closed. The other players get a "confirm" message. "Change score" sends a dispute to the admins and the other players. The admin review sheet sets the final score and tells everyone.
- **Social:** follow and unfollow; friends with requests, or instant for open accounts (`profile.friends='open'`); invite up to 3 players or all friends, where the first 3 to accept get the spots (`cap` 3); kudos reactions (`REACT`).
- **Admins:** see who booked each slot, block or unblock slots, cancel any booking, and review, edit or delete any score.
- **Demo mode:** 100 made-up players and about 700 games, plus bookings, friends and an admin inbox, all in memory. The signed-in user is an admin, alongside Caelan and Surya. A **Switch to Arjun** button swaps to an ordinary player, Arjun Kamat, to see the other side.
- **Look and feel:**
  - **Colours and fonts:** dark aubergine with the logo purple `#6045a7` and ball-yellow accent `#dcf55a`; fonts Unbounded and Manrope; a light theme via `[data-theme=light]`.
  - **Animations:** sliding pill option bars with hold-and-slide, the slide-to-verify bar on sign-in, glowing cards on scroll, animated icons (`ANIMS`, `data-a`), a padel-ball pop-up (`celebrate()`), sounds made in the browser (`sfx()`), vibration, notifications (`maybeAskNotif`, `sysNotify`), a rankings loader and refresh, and a gold, silver and bronze animated podium.
  - **Avatars:** purple initials or an uploaded photo only.

## Rules for working on it
- **Bump the version** on `config.js?v=`, `app.js?v=` and `logo-sm.png?v=` in `index.html` with every release (currently `v=19`). Browsers cached old files before, which broke the podium.
- **Test** with Playwright (Chromium) on `file:///…/index.html`. Start demo mode with `[data-act=demo]`, then click through. Check for page errors and look at screenshots on a phone-sized (390×844) and a computer-sized screen. Check that the code parses with `node --check app.js` and `setup.sql` with `pglast`.
- **Commit and push to `main`** of `marcgoveiawork-bit/racquet-culture` when done. The live site updates itself.
- **Database changes:** add them to `setup.sql` in a safe-to-re-run way, then run them with the Management API.
- **Writing:** keep the app's wording plain and friendly. I like clear step-by-step instructions, and screenshots of changes.

## Not done yet / ideas
- An email service (Gmail app password, or Resend/Brevo with a domain) under Supabase Auth → SMTP. After that, turn "Confirm email" back on; password-reset emails will then reach players.
- Final prices and peak hours after my meeting with Caelan.
- Making Caelan and Surya admins once they've signed up.
- Online payment for bookings: not built, and the app only shows prices.
- More courts or locations: add them to `COURT_NOS` and `VENUES`. The `court` check in `setup.sql` only allows `padel` and `pickleball`, and bookings don't store a court number yet.

## Release workflow (from V1.1 on)
- The live app (repo root) is **V1.3** (V1.1 to V1.3 released 21 Nov 2026; V1.2 and V1.3 went straight live at Marc's request).2 released 21 Nov 2026; V1.2 went straight live at Marc's request). New work goes only into `preview/`, served at https://marcgoveiawork-bit.github.io/racquet-culture/preview/ and labelled e.g. `V1.1demo` (set by `window.RC_VER` in `preview/index.html`; `window.RC_PREVIEW=true` there).
- `preview/` always opens in demo mode with made-up data. Only the developer and players given **Demo access** (rc_demo_access) can get in.
- When Marc confirms a demo version, copy `preview/app.js` and `preview/index.html` to the root, set the root's `RC_VER` to the release number (e.g. `1.1`) and `RC_PREVIEW` to false (or remove that line), bump `v=`, and merge. Never change the root without Marc's OK.
- Roles (V1.3): Developer (platinum, rc_developers) > Owner (gold, rc_owners + rc_admins) > Admin (silver, rc_admins) > Coach (bronze, rc_coaches) > Player. The Developer sets anyone up to Owner; Owners set up to Admin; Admins switch Player/Coach. Demo views go up to the person's own role.
