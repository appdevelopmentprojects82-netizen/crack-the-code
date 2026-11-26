# Crack The Code — mobile

A phone puzzle game. Every level hides a secret code; players crack it from the coloured feedback.

* The player types a code. Green = right digit and right place, yellow = in the code but in the wrong place, grey = not in the code.
* 4 tries per level. Codes have 4 digits, 5 digits from level 101 and 6 digits from level 201.
* Each win pays 40 coins; watching an ad doubles them.
* A hint shows one correct digit in its place. Hints come in packs of 3 for 700 coins.
* Locked boxes hide the colours for one position of the code: 🔒 a padlock opens once the digit in the box with the 🔑 has been found (from level 11).
  🕸️ A spider web breaks once 3 other digits have been found (from level 31; both kinds from level 101).
* Level-break ads come after the coins have been collected: after every 3rd level up to level 21, every 2nd level up to level 100, and every level after that.
* Progress, coins and hints are saved on the phone.

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
At the top of `game.js`: tries per level, coins per win, hint prices, code length, when locked boxes start, and ad timing.
After changing any file, raise `VERSION` in `sw.js` so installed copies update.

## Files
`index.html`, `style.css`, `game.js` (the game), `sounds.js` (the same sounds and music as the live game),
`pictures/1-5.jpg` (backgrounds, smaller copies of the live game's pictures), `icons/`, `manifest.json` and `sw.js` (home-screen install and offline play).
