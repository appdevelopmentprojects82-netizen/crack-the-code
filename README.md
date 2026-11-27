# Code Quest — mobile

A phone puzzle game. Every level hides a secret code; players crack it from the coloured feedback.

* The player types a code. Green = right digit and right place, yellow = in the code but in the wrong place, grey = not in the code.
* 4 tries per level, plus 2 locked extra tries (each opened with an ad or 100 coins). Codes have 4 digits, 5 digits from level 101 and 6 digits from level 201.
* Each win pays 40 coins; watching an ad doubles them.
* A hint shows one correct digit in its place. Hints come in packs of 3 for 700 coins.
* Locked boxes hide the colours for one position of the code: 🔒 a padlock opens once the digit in the box with the 🔑 has been found (from level 11).
  🕸️ A spider web breaks once 3 other digits have been found (from level 31; both kinds from level 101).
* Level-break ads come after the coins have been collected: after every 3rd level up to level 21, every 2nd level up to level 100, and every level after that.
* 5 lives. Losing a level costs one; one comes back every 4 hours, or all 5 can be refilled for 1500 coins.
* Daily targets: win 5 / 10 / 15 / 20 levels in a day for 20 / 20 / 20 / 40 coins (100 a day). Resets at midnight.
* Progress, coins, hints, lives, name and character are saved on the phone.

## Screens
* **Loading screen** with the 3D vault art (`art/splash.jpg`).
* **Home** (wooden background): character picture (tap to change name and character; 30 characters unlock with levels),
  daily targets (gift button), lives heart (shows FULL at 5), coins, settings (signed-in account, (sound, music, vibration, notifications, restore purchases, help & support)),
  the next level in the middle (tap to play) and "watch an ad for 100 coins".
* Bottom icons: **Shop**, **Home**, **Leaderboard**.
* **Shop**: coin packs, remove ads between levels, hints, lives, and a free ad for 100 coins.
  Prices are set in US dollars in `shop.js` and shown in the player's own currency, rounded up to .49 / .99.
* **Leaderboard**: the player's own stats for now; world rankings need an online server.

## Purchases
Not connected yet: on the live site "buy" says purchases open soon; on your own computer it gives a free TEST purchase.
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
`shop.js` (prices and purchases), `account.js` (sign-in), `ads.js`, `art/` (loading screen, wood background, gold coin), `sounds.js` (the same sounds and music as the live game),
`pictures/1-5.jpg` (backgrounds, smaller copies of the live game's pictures), `icons/`, `manifest.json` and `sw.js` (home-screen install and offline play).
