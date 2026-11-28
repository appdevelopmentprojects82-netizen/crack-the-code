# Code Quest — mobile

A phone puzzle game. Every level hides a secret code; players crack it from the coloured feedback.

* The player types a code. Green = right digit and right place, yellow = in the code but in the wrong place, grey = not in the code.
* 4 tries per level, plus 2 locked extra tries (each opened with an ad or 100 coins). Codes have 4 digits, 5 digits from level 101 and 6 digits from level 201.
* Each win pays 40 coins; watching an ad doubles them.
* A hint shows one correct digit in its place. Hints come in packs of 3 for 700 coins.
* **Cinematic map** on the home page (pictures in `art/world/`, roads traced in `quest.js`): the next level sits in the middle of the screen,
  solid dots behind it, hollow dots ahead; the camera glides up after each win (no scrolling). Earlier version of the map: worlds of 20 levels (Enchanted Forest, Desert Tombs, Ice Caverns, Misty Marsh, Sky Temple,
  Volcano Forge, Dragon's Keep, Starfall Citadel, then again as "II"…), each with its own colours, particles and music (`quest.js`).
* **Obstacles**, one per level, from level 30 and then every 5-6 levels (never next to a boss): 🔒 padlock, 🕸️ spider web,
  ❄️ ice (colour only on every 2nd guess), ⛓️ chain (two boxes hidden until both are right in one guess), 🌫️ fog (yellow looks grey).
* **Boss** on the last level of every world: 3 tries, ×3 coins.
* **Eliminate** 🧹 for 1500 coins removes 3 wrong digits from the keypad.
* **Daily puzzle** (same code for everyone, 6 tries, own ranking).
* **Friends**: add by exact username or by tapping a player on the leaderboard; messages for invites.
* **Races**: race a friend (up to 10 players) or a **random player**. 100 coins to enter, the winner takes the whole pot (ties share it).
  A race lasts until midnight (UTC). For a random race a few real players get an invite; if nobody joins within 10 seconds,
  a computer player of normal skill takes the place (`RACE_MATCH_SECONDS` in `extras.js`).
* **Login streak** (7 days of rewards), **star chests** (every 30 stars), **achievements** that unlock keypad styles,
  and a **close call** message when a level is won on the last try.
* Level-break ads come after the coins have been collected: after every 3rd level up to level 21, every 2nd level up to level 100, and every level after that.
* 5 lives. Losing a level costs one; one comes back every 4 hours, or all 5 can be refilled for 1500 coins.
* Daily targets: win 5 / 10 / 15 / 20 levels in a day for 20 / 20 / 20 / 40 coins (100 a day). Resets at midnight.
* Watch & earn: 1 ad = 50 coins, 3 ads = 200 more, 5 ads = 300 more (every day). Rewarded ads last 30 seconds; shorter ads play back to back.
* Levels never end. A half-played level carries on where it stopped when the app is opened again.
* First-time guided instructions (dimmed screen, arrows) for how to play, the padlock and the spider web; the ? button shows them again.
* Progress, coins, hints, lives, name and character are saved on the phone.

## Screens
* **Loading screen** with the 3D vault art (`art/splash.jpg`).
* **Home** (wooden background): character picture (tap to change name and character; 30 characters unlock with levels),
  daily targets (gift button), lives heart (shows FULL at 5), coins, settings (signed-in account, (sound, music, vibration, notifications, restore purchases, help & support)),
  the next level in the middle (tap to play) and "watch an ad for 100 coins".
* Bottom icons: **Shop**, **Home**, **Leaderboard**.
* **Shop**: a box for each coin pack and remove ads, shown at -50% with the full price crossed out (`PROMO_PERCENT` in `shop.js`); free coins from ads at the bottom.
  Prices are set in US dollars in `shop.js` and shown in the player's own currency, rounded up to .49 / .99.
* **Leaderboard**: every player, once `LEADERBOARD_URL` in `leaderboard.js` is filled in (steps at the top of that file).
  Tabs: **All time**, **Weekly** (levels won this week; the top 3 get 10,000 / 5,000 / 2,500 coins the next time they open the game)
  and **Today's puzzle**. 100 computer players (`BOT_COUNT`, best one at level `BOT_TOP_LEVEL` = 203) fill both boards;
  real players push them off the bottom as more people play.
* Pop-ups close with the white **x** in their top-left corner.

## Purchases
Not connected yet: while `TEST_PURCHASES` is true every purchase is simulated for free (no money taken).
Details are at the top of `shop.js`.

## Sign-in (Apple ID / Google)
`account.js` signs the player in automatically with Game Center (iPhone) or Google Play Games (Android),
and "Restore purchases" then uses that account. This only works in the app-store version of the game
(the web game wrapped with Capacitor, plus the plugins named at the top of `account.js` and `shop.js`).
In a normal browser the player is a guest.

## Ads
Until `ads.js` has your AdSense details, the game shows placeholder ads in the right places.
Instructions are at the top of `ads.js`.

## Play online
**https://appdevelopmentprojects82-netizen.github.io/crack-the-code/**

To update the website after changing files (and raising `VERSION` in `sw.js`):

    git add -A
    git commit -m "Update"
    git push

The site updates about a minute later.

## Play on your phone without the internet link (same Wi-Fi)
Double-click **Play on Phone.bat**, then open the address it shows in your phone's browser.

## Settings
At the top of `game.js`: tries per level, coins per win, hint prices, lives, code length, when locked boxes start, and ad timing.
At the top of `shop.js`: shop prices. At the top of `app.js`: the 30 characters and the support email.
After changing any file, raise `VERSION` in `sw.js` so installed copies update.

## Files
`index.html`, `style.css`, `game.js` (the game), `app.js` (home, shop, profile, settings, leaderboard),
`shop.js` (prices and purchases), `account.js` (sign-in), `leaderboard.js` (online rankings and races), `tour.js` (guided instructions),
`quest.js` (worlds, obstacle schedule, quest map), `extras.js` (streak, chests, achievements, styles, daily puzzle, races), `ads.js`, `art/` (loading screen, wood background, gold coin), `sounds.js` (the same sounds and music as the live game),
`pictures/1-5.jpg` (backgrounds, smaller copies of the live game's pictures), `icons/`, `manifest.json` and `sw.js` (home-screen install and offline play).
