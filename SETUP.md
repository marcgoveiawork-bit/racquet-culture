# Racquet Culture app

A web app for the Racquet Culture community in Goa: accounts, player profiles, a level check for padel and pickleball, score logging and community rankings.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page and all the styling |
| `app.js` | Everything the app does |
| `config.js` | Where the live database details go |
| `setup.sql` | Creates the live database tables (run once in Supabase) |
| `logo.png` | The Racquet Culture logo, white on a transparent background |

## Try it now (preview mode)

Open `index.html` in a browser, or use the GitHub Pages site. With `config.js` empty, the app runs in **preview mode**:
accounts, profiles and scores are saved in that browser only. Each phone has its own separate club.

To see full rankings straight away, sign up, finish your profile, then go to **Profile → Add demo players**.
This adds 12 made-up players and 40 example games, all marked *Demo*. **Remove demo players** takes them out again.

## Turn on the live database (about 10 minutes)

When this is done, everyone shares one set of accounts, profiles and rankings, and new scores appear for everyone straight away.

### 1. Create the database

1. Go to supabase.com and sign in (the same account as the JFM project is fine).
2. Create a **new project** for Racquet Culture. Pick the Mumbai (South Asia) region if it is offered.
3. Wait for it to finish setting up.

### 2. Sign-in settings

Players create an account with their email, a username and a password, and sign in with email and password.
Emails stay private: other players only see names and usernames.

1. Open **Authentication → URL Configuration**. Set **Site URL** to the app's address,
   `https://marcgoveiawork-bit.github.io/racquet-culture/`, and add the same address under **Redirect URLs**.
   Links in password reset and confirmation emails come back here.
2. Open **Authentication → Sign In / Providers → Email** and turn **Confirm email** off for now, then save.

Why off for now: Supabase's built-in email sender is only for testing. It sends very few emails an hour and only to
members of your Supabase team, so players would never receive their confirmation or password reset emails.
To send real emails, connect an email service under **Authentication → Emails → SMTP Settings**
(Resend, Brevo and similar services have free plans). Once that works, you can turn **Confirm email** back on:
the app already handles confirmation links and password reset emails.

### 3. Create the tables

1. Open **SQL Editor → New query**.
2. Paste everything from `setup.sql` and press **Run**.

### 4. Connect the app

1. Open **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Paste them into `config.js`:

```js
window.RC_LIVE = {
  url: 'https://xxxx.supabase.co',
  key: 'eyJ...'
};
```

4. Commit the change. GitHub Pages updates the site on its own within a minute or two.

### 5. Check it

Create an account on one phone and finish the profile. On a second phone, start creating an account with the same username.
It should say **This username is already taken. Try another one.**

## Admins

Admins use the same sign-in as everyone else, with extra control:

- See who booked every court slot, cancel any booking, and block slots (coaching, maintenance, events)
- Review disputed scores and set the final score, or edit and delete any score
- Everyone in the game, and the other admins, are told which admin changed a score

Only you can make someone an admin, in Supabase: **SQL Editor → New query**, paste this with their app username, and **Run**:

```sql
insert into public.rc_admins (user_id)
select id from public.rc_profiles where lower(username) = lower('USERNAME')
on conflict do nothing;
```

It should say **Success. 1 row affected**. The person sees the admin tools the next time they open the app.

## Court bookings, confirmations and the inbox

- Courts open from 6:00 am to midnight, in 30-minute slots. Players can book up to 3 hours and invite up to 3 players.
  To change the hours, edit `OPEN_H`, `CLOSE_H` and `MAX_GAME` near the top of `app.js` (and the slot limits in `setup.sql`).
- When a score is added, the other players in the game get a message asking them to confirm it.
  If someone taps **Change score**, the admins and the other players are told, and the score is left out of the rankings until an admin sets the final score.
- Messages arrive live while the app is open; the number on the inbox shows unread ones.

## Friends, following and kudos

- **Follow** anyone, no approval needed.
- **Friends** are two-way. Each player chooses in Profile → Settings: *Ask me first* (they accept or reject each request) or *Open account* (anyone can add them straight away).
  After a rejection, a new request to the same person can only be sent 5 days later. The database enforces this, not just the app.
- When booking, players can invite up to 3 people, or **invite all their friends** at once. The first 3 to say yes get the spots.
- After a game, players can send **kudos** to the others in it (👍 Kudos, ❤️ Good game, 🍀 Better luck next time, 🔥 On fire, 🧱 Brick wall at the net, 🌈 Lob of the day). It arrives in their inbox with the sender's username.

## Adding a score

Players pick the date, the court (only Court 1 for each sport for now, set in `COURT_NOS` in `app.js`), and the start and end time in 30-minute slots.
Two games can't be logged on the same court at the same time, and a slot booked by other people or closed by an admin can't be used.

## How levels and rankings work

- **Starting level.** During profile set-up each player picks Beginner, Intermediate or Expert, then answers 5 or 6 questions
  based on how clubs and rating guides describe each level. This gives a starting number:
  - Padel: 0.5 to 7.0 (Beginner below 2.5, Intermediate 2.5 to 4.49, Pro 4.5 and up)
  - Pickleball: 1.0 to 6.0 (Beginner below 3.0, Intermediate 3.0 to 3.99, Pro 4.0 and up)
- **Each result moves the level.** Each team's strength is the average of its two players' levels.
  Beating a stronger team earns more; losing to a weaker team costs more. A strong player with a weaker partner is not punished,
  because their team's average is lower, so a win counts for more and a loss costs less.
- **Margin counts a little.** A big win moves levels up to 20% more than a close one.
- **New players settle fast.** For the first 5 games a level moves twice as fast, then 1.4 times as fast until game 15.
- **Players without an account.** Whoever logs the score must enter the level of each guest. Members' levels fill in on their own.
  Only members' levels change.
- **Three rankings per sport.** Beginner, Intermediate and Pro. Players move between them as their level crosses the line.
- **Everyone sees the same numbers.** Levels are worked out by replaying every game in date order, so deleting a mistaken score
  recalculates everything correctly.

## Your own avatars

The 12 pixel avatars are placeholders. To use your own artwork:

1. Put the images in an `avatars` folder next to `index.html`, e.g. `avatars/a1.png` (square images, at least 256 × 256).
2. In `app.js`, find `const AVATARS=` and change entries to point at the files, for example:

```js
const AVATARS=[{id:'px1',src:'avatars/a1.png'},{id:'px2',src:'avatars/a2.png'}, ...];
```

Keep the same `id`s so anyone who already picked an avatar gets the new picture.

## Not built yet

- Sending game invites (players can already say whether they are open to invites, and others can filter for them).
- Confirming scores: right now a score counts as soon as one player logs it. A later version could ask an opponent to confirm.
- Password reset emails are built in (**Get help** on the sign-in page), but only arrive once an email service is connected (see step 2).
  Until then an admin can set a temporary password in Supabase: open **SQL Editor → New query**, run the lines below
  with the player's email and a temporary password, tell the player the temporary password, and ask them to change it
  in the app under **Profile → Change password**.

```sql
update auth.users
set encrypted_password = extensions.crypt('Temporary123', extensions.gen_salt('bf'))
where email = 'player@example.com';
```

  It should say **Success. 1 row affected**. **0 rows** means no account uses that email.
