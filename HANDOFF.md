# Racquet Culture app: handover prompt

Paste everything below into a new chat to carry on.

---

I'm Marc. With my cousins Caelan DaCosta and Surya N, I run **Racquet Culture**, a padel and pickleball club in Chicalim, Goa, India (1 padel court, 1 pickleball court). You built our community web app with me in an earlier chat. Please carry on from where we left off. Read `HANDOFF.md`, `SETUP.md`, `app.js`, `index.html` and `setup.sql` in the repo before changing anything.

## Where things live
- **Code:** GitHub repo `marcgoveiawork-bit/racquet-culture`, branch `main`. Files are at the repo root: `index.html` (markup and all CSS), `app.js` (all logic, about 1,700 lines), `config.js`, `setup.sql`, `SETUP.md`, `logo.png`, `logo-sm.png`, `icon-192.png`, `icon-512.png`.
- **Hosting:** GitHub Pages from `main` / root, on the custom domain https://playonecourt.com/ (the `CNAME` file; preview at https://playonecourt.com/preview/). The old address https://marcgoveiawork-bit.github.io/racquet-culture/ redirects there. DNS is at GoDaddy: four A records and four AAAA records for GitHub Pages on `@`, and `www` as a CNAME to `marcgoveiawork-bit.github.io`. Pushing to `main` updates the live site within a minute or two. No Vercel.
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
- **Stop fake games (idea box, Marc 24 Nov 2026, not started):** players can log scores on any free slot, and today only owners and admins cancelling them catches fakes. Options, strongest first: (1) at clubs with in-app booking, only allow a score on a slot that was booked and confirmed, by someone on that booking; (2) flag suspicious patterns for staff (same 4 players again and again, many games a day, one player always winning big); (3) limits such as 3 games a day per player and no logging games more than 2 days old; (4) opponent confirms before it counts (weakest, brings back waiting). Clubs booking outside the app (District, Hudle) can only use 2 and 3. Build on preview first when Marc asks.
- More courts or locations: add them to `COURT_NOS` and `VENUES`. The `court` check in `setup.sql` only allows `padel` and `pickleball`, and bookings don't store a court number yet.

## Release workflow (from V1.1 on)
- The live app (repo root) is **V1.5** (24 Nov 2026): the app is now called **OneCourt** (served at https://playonecourt.com/), with every club in `VENUES`, the club switcher and cards, ads, demo settings, game history, the after-game flow and Instagram links, all from V1.5demo. Before that it was **V1.4** (My Padel name and logo, opening screen; 21 Nov 2026), and before that **V1.3** (V1.1 to V1.3 released 21 Nov 2026; V1.2 and V1.3 went straight live at Marc's request). New work goes only into `preview/`, served at https://playonecourt.com/preview/ and labelled e.g. `V1.1demo` (set by `window.RC_VER` in `preview/index.html`; `window.RC_PREVIEW=true` there).
- `preview/` always opens in demo mode with made-up data. Only the developer and players given **Demo access** (rc_demo_access) can get in.
- When Marc confirms a demo version, copy `preview/app.js` and `preview/index.html` to the root, set the root's `RC_VER` to the release number (e.g. `1.1`) and `RC_PREVIEW` to false (or remove that line), bump `v=`, and merge. Never change the root without Marc's OK.
- Roles (V1.3): Developer (platinum, rc_developers) > Owner (gold, rc_owners + rc_admins) > Admin (silver, rc_admins) > Coach (bronze, rc_coaches) > Player. The Developer sets anyone up to Owner; Owners set up to Admin; Admins switch Player/Coach. Demo views go up to the person's own role.

### Live shows only confirmed clubs (V1.5, 24 Nov 2026)
- On the live app, real players only see clubs listed in `clubs` in `config.js` (now just `['rc']`), and no "Coming soon" clubs. Demo mode and the preview show every club (`ALL_VENUES`, `ALL_SOON`, `setVenues()` in `app.js`). When a club confirms, add its id to `clubs` in the root `config.js` (Marc's OK needed).

## V1.4: My Padel name, logo and opening screen
- The live app is now called **My Padel**, with Marc's logo as the app and home-screen icon (`brand/`).
- Opening the app shows the My Padel logo, the tagline "Every court. One app." and "Pick a court to start" (`showWelcome`, `WELCOME_COURTS` in `app.js`). Live lists only Racquet Culture; tapping it carries on to sign-in or the app as before. A password-reset link skips the opening screen.

## V1.5demo: several clubs, starting with Sunday (preview only, 21 Nov 2026)
- Was labelled V1.4demo before V1.4 went live with just the name, logo and opening screen.
- The preview's opening screen lists every club in `VENUES`. Picking one sets the club; in demo, picking a club the account hasn't joined opens that club's sign-in.
- The app is now called **My Padel** (title, home-screen name). The home-screen icon is Marc's My Padel logo in `preview/brand/` (icon-192, icon-512, apple-touch-icon). To change it, replace those files, same names and sizes.
- **Clubs** live in `VENUES` in `app.js`: Racquet Culture (`rc`, in-app slot booking) and Sunday Racquet & Social Club (`sunday`, Siolim; 3 padel + 1 pickleball court; `book.kind:'link'` to District). To add a club: an entry in `VENUES`, a logo in `preview/venues/`, and a `:root[data-venue="id"]` colour block in `index.html` (copy Sunday's).
- The logo in the top bar is a swipeable club switcher. The current club is `VID` (saved as `rc_venue`, or `?venue=` in the URL). It colours the app via `data-venue` on `<html>`.
- Matches, bookings, conduct reports and most messages carry `venue` (missing or `chicalim` = `rc`). `reload()` keeps only the current club's, so levels and rankings are per club. Friend and follow messages show everywhere.
- Accounts are shared. Profiles have `home` (the first club they joined, used only as a fallback, never shown) and `venues` (clubs joined). Opening a club you haven't joined no longer asks for a sign-in (see the one-time sign-in below): `venueSignIn` now just joins the club and shows its loading screen. Your level there starts from your level at the club you came from (`profile.vstart[club]`), and you show under **Yet to play** until you log a game there.
- Roles are per club (V1.5demo): everyone joins as a player, and someone can be owner, admin or coach at one club and a player at another. In the app roles are "userId@club" keys in `S.admins`, `S.owners`, `S.coaches`; in the database `rc_admins`, `rc_owners`, `rc_coaches` have a `venue` column (primary key user_id + venue), set up by `club-roles.sql` (run 21 Nov 2026, also in setup.sql). The developer sets roles at every club from a player's profile; owners give admin and admins give coach only at their own club. Profiles list every club with the person's role there.
- Database: per-club roles are enforced in RLS (`rc_is_admin_at(venue)` etc. on scores, reports, club news and role tables). The old `rc_is_admin()` now means admin at Racquet Culture. When multi-club goes live, the live app must read the `venue` column of the role tables (the preview's `Live.load` already does).

### One-time My Padel sign-in (V1.5demo, preview only, 23 Nov 2026)
- Opening the app shows the My Padel opening screen (`showWelcome`). Signed out: **Sign in** / **Create an account** open My Padel's own sign-in page in the My Padel blue (`applyMP()`, `:root[data-venue="mp"]` in `index.html`), with no club picker.
- After sign-in, a new player answers the profile questions (photo, gender, sports, hand, invites, times, side, then the level questions) on My Padel blue pages. Then **Pick a court to begin** (`showPicker`). Picking a court shows that club's loading screen (`splash`) and goes straight in (`enterCourt`).
- New players have `nohome:true` until they pick their first court; `joinVenue` then sets `home` and `venues`. Older profiles without `home` still count as Racquet Culture members.
- Switching to a club you haven't played at (top-bar switcher, club chips, other clubs card) joins it on the spot with no sign-in, shows its loading screen, a "Yet to play" card on Home (`yetCard`) and a toast. The old club sign-in page is gone.
- Signed-in players opening the app see the court picker each time (clubs they haven't joined say "New to you · yet to play"). Sign out goes back to the opening screen.
- Demo: the court picker has "Demo: try the first-time sign-in as a new player", and the demo bar has a **New player** option (`demoNew` → `demoNewPlayer`), which runs the whole sign-up, questions and court pick as a made-up player (`d_new`); any email and password work.

### Bottom bar centred on phones (V1.5demo, preview only, 23 Nov 2026)
- On screens 420px wide or less, the five dock buttons share the width equally (`flex:1 1 0`), so Add score sits in the exact middle and the Home pill is the same size as the others. The tennis ball's top margin is -17px there so the "Add score" label lines up with the other labels. Wider screens are unchanged.

### Switch club pop-up: equal cards and keyboard fix (V1.5demo, preview only, 23 Nov 2026)
- Every club row in Switch club is the same height (108px): name up to two lines, area one line with "…", tag below.
- The search box sticks under Back. Focusing it locks the pop-up's height and scrolls the search to the top, so results show right under it.
- `sheetKb()` (called by every `openSheet`) watches `visualViewport`; when a phone keyboard is open it adds `.kb` to the backdrop, pinning the pop-up to the visible area above the keyboard at full height, so it no longer drops down behind it.

### Phone pop-up fixes and profile rank chips (V1.5demo, preview only, 23 Nov 2026)
- `pageLock()` freezes the page (body `position:fixed`, scroll restored on close) while any pop-up is open, so on phones the page behind can't scroll and the keyboard can't push things around. `closeSheet` blurs any focused field first. `sheetKb` now measures the keyboard against the tallest height seen (not `innerHeight`) and pins the pop-up to the top of the visible area.
- Profile club chips show the ranking band (Beginner / Intermediate / Pro) beside the place. Tapping one (`clubRank`, chip has `data-p`) opens that club's rankings on the player's sport and band, scrolls to their row and keeps it lit (`spotRow`, `.spot`) until the screen is touched.

### Game history for admins (V1.5demo, preview only, 23 Nov 2026)
- On each club's Home, admins, owners and the developer see **Game history**: every game logged at that club in the last 7 days (`histGames`, `HIST_DAYS`), newest first, 5 at a time with "Show all". Older games leave the list on their own but stay in levels and rankings (nothing is deleted).
- Each row shows who logged it (and who last edited it) with **Edit game** and **Cancel game** (`gameSheet`, `egPicker`, `saveGameEdit`, `gameCancelYes`). Edit changes the score and/or swaps players (club members with a level in that sport); the match gets `review` (final) and an `edits` log. Cancel deletes the match. Rankings are recomputed by `rate()` replaying every game.
- Every player affected (including anyone taken out or added) gets an inbox message naming the staff member and their role, e.g. "Caelan DaCosta (Admin) changed the score of your game" (`game_edit`, `game_cancel`, `game_logged`; `staffName`). They sit under the Admin inbox tab. An admin deleting someone else's score from a profile also sends `game_cancel`.
- **Add score → Log for others** (admins and above): pick all players (yourself excluded), any sport the club has. The game is saved as final (`logged:true`, `review`) and each player gets `game_logged`.
- Database: no change was needed (admins at a club can already update and delete its matches; anyone can insert a match they created). Suggested hardening before going live: only let club admins send `game_edit`, `game_cancel` and `game_logged` messages, and only let admins insert a match whose data has `logged` or `review`.
- **Scoring rule (Marc, 23 Nov 2026, preview only):** every logged score counts in the rankings straight away, without waiting for the other players to confirm. A disputed score keeps counting as added; rankings only move if an admin changes it. A game more than 7 days old is final (`lockedGame`): it can't be disputed, edited, reviewed or deleted, and an unreviewed dispute just lapses with the score as added. (Before this, disputed scores were left out of the rankings until reviewed.)

## V1.9demo: club tournaments (preview only, 25 Nov 2026)
Surya's idea, asked for by Marc. Released to live as **V1.9** on 25 Nov 2026 (Marc said go); live still shows only Racquet Culture.
- **Dock:** six tabs. Home, Book, Players | Add score | Rankings, Tournaments. The dock is a grid (`2fr 2fr 2fr auto 3fr 3fr`) so both halves are the same width and Add score stays dead centre. Players moved to the left so Tournaments could sit right of Rankings.
- **Tables (run in Supabase, also at the end of `setup.sql`):** `rc_tournaments`, `rc_tour_entries` (`tour_id`), `rc_tour_matches` (`tour_id`), each `id, venue, data jsonb`. Everyone signed in can read. Only owners (`rc_is_owner_at`) create or delete tournaments; owners and admins (`rc_is_admin_at`) edit them, accept entries and write matches. The trigger `rc_tour_entry_guard` limits players to: asking to join an open tournament still taking sign-ups, answering an invite, confirming as a partner, adding a partner to their own entry, or pulling out. Only staff can send `tour_new`, `tour_invite`, `tour_ok`, `tour_no`, `tour_draw`, `tour_result` messages. Realtime is on for all three.
- **Code (`app.js`, "Club tournaments" section before `onRemote`):** `vTour` (list: Live now / Open for sign-ups / Finished), `vTourOne` (details, entry fee, your entry card, division tabs), `tDivPanel` (sign-ups and staff tools, or bracket / league table), `vRef` (club-coloured court, scoreboard, Point buttons for staff), `vTourNew` (create / edit), `tJoinSheet`, `tPickSheet`, `tDrawSheet`, `tHandSheet`, `tPairSolos`.
- **Scoring:** a match stores only the list of who won each point (`pts`); `tScore` works out the score, so Undo drops the last point. Padel: 15/30/40, advantage or golden point, sets to 6 with a tiebreak at 6–6 (or a pro set to 9). Pickleball: rally scoring to 11 or 15, win by 2. Score saves run one at a time (`tSaveMatches` queue) and a refresh never overwrites a score still saving (`tPend`).
- **Results count:** finishing a match saves a normal `rc_matches` game (`logged:true`, `review`, `tour:<id>`), so it moves levels and rankings, and moves the winner into the next round.
- **Live view:** realtime updates everyone; on top of that, the tournament page has a refresh button and an Auto-refresh switch (`rc_tour_auto`, every 10 s while a tournament is live).
- **Messages:** `tour_new` to every club member for an open tournament ("An open tournament has been created in your club" → opens sign-up), `tour_invite` to invited players only, plus `tour_partner`, `tour_pyes`, `tour_pno`, `tour_ok`, `tour_no`, `tour_draw`, `tour_result` (`tMsg`, `tNeeds`).
- **Demo:** `demoTours` gives every club a cup running live today (points tick in via `demoTourTick`), and Racquet Culture also gets a pickleball league taking sign-ups, an invite-only event with the demo accounts invited, and a finished league with champions.
- Not built yet: combined groups + knockout, seeding, court scheduling for tournament matches, collecting entry fees in the app.

### Levels are never lost (25 Nov 2026)
- What happened: on the preview, the tournament tables briefly couldn't be read. The load failed, `enter()` thought Marc's account had no profile and saved a fresh blank one over it (setup false, no levels). Only Marc's profile was hit (no games were lost; he had none logged).
- Database guard (live now, in `setup.sql`, trigger `rc_profile_keep`): a set-up profile can't be turned back into a blank one, and its levels can't be wiped, whatever the app sends.
- Preview `enter()`: retries the load 3 times, then shows "Couldn't load the club. Your account and levels are safe" with Try again (`loadFailed`). A new profile is only made after checking the database has none for that account, and with an insert (`createProfile`), never an upsert. Live got the same change as V1.8.1 (25 Nov 2026, Marc said go).
- Tournament match view: each player's name opens their profile (`tNameBtns`).

## V1.10: Americano and Mexicano tournaments (released live 25 Nov 2026)
- Two new tournament formats beside knockout/groups: `isAm(T)` is true for `format` 'americano' or 'mexicano'.
- Players sign up solo. `T.mfmt` is `am16`/`am21`/`am24`/`am32` (points per match, `T_AMP`), `T.amr` is the number of rounds (3 to 12, default 7).
- Americano: the whole schedule is made at the draw (`tAmSchedule`), partners and opponents rotate, sit-outs are shared out fairly (`tAmPick`, `tAmSits`). Mixed keeps a man and a woman on each side.
- Mexicano: only round 1 is drawn (random or by level). When a round finishes `tAmNext` pairs the next one from the table (`tMexRound`: 1st and 4th v 2nd and 3rd).
- Scoring: `tScore` counts rally points to the total; staff can also enter the final score in one go (`tAmScoreSheet`). The table (`tAmTable`) sorts by points won, then wins, then difference. Results still feed rankings as normal match records.
- Each Americano/Mexicano division has Max players (4 to 48), Courts available (1 to 12) and Rounds (`d.amr`, 0 = auto). Auto rounds = enough for everyone to partner everyone about once, `ceil(n(n-1)/(4 x courts in use))`, between 3 and 15 (`tAmAuto`). It is worked out again from the real sign-ups at the draw and fixed on the division then. Players beyond courts x 4 sit out in turn (`tAmPick`). Older tournaments with `T.amr` still use it (`tAmR`).
- Demo: Racquet Culture has "Friday Night Americano" (in progress) and "Sunday Mexicano" (taking sign-ups).

### Joining a division one level away (V1.10demo)
- A player can ask to join a division one level from their own (Beginner and Intermediate, or Intermediate and Pro). Two levels apart is still blocked. `tElig(T,d,uids,soft)` allows it when `soft` is set, and `tOff` lists who is off-level.
- The player gets an "Are you sure?" sheet first. The entry is always `requested`, even when the tournament doesn't need staff approval.
- Staff see a level chip on the request (`tOffChip`), and pressing Accept opens a "Different level" sheet asking if they're sure (`ACT.tourOk(v,true)` skips it). The database guard needed no change, because players may always insert `requested`.

## V1.11: Contact us (released live 25 Nov 2026)
- Support email is onecourtsupport@gmail.com (`SUPPORT_EMAIL` in app.js). Settings has a Help card with "Email us", and the sign-in form has "Anything else? Email us". Both open a mail with the subject "OneCourt help".
- Profile picture for the support Gmail: /mnt/project-files/brand/onecourt-profile-picture.png (made from brand/icon-512.png, on a square blue background so it crops well to a circle).

## V1.12: toggles easier to see in dark mode (released live 26 Nov 2026)
- The page now declares `color-scheme: dark` (with `<meta name="color-scheme">`) and `<meta name="darkreader-lock">`. Without these, Chrome's auto dark mode and the Dark Reader extension repainted the app and turned the white switch knob dark. Light theme still sets `color-scheme: light`.
- The off switch track is a little brighter and has a thin outline.
