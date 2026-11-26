# Crack The Code — mobile

A phone puzzle game. Every level hides a 4-digit code in a coded clue.

* Each clue box hides one digit (keyboard symbols, Morse, planets, Maya numbers, Braille, …).
* The player types a code. Green = right digit and right place, yellow = in the code but in the wrong place, grey = not in the code.
* 4 tries per level. Codes have 4 digits, 5 digits from level 101 and 6 digits from level 201.
* Each win pays 40 coins; watching an ad doubles them.
* A hint shows one correct digit in its place. Hints come in packs of 3 for 700 coins.
* Locked boxes: 🔒 a padlocked box opens once the digit in the box with the 🔑 has been found (from level 11).
  🕸️ A spider web breaks once 3 other digits have been found (from level 31; both kinds from level 101).
* Level-break ads come after the coins have been collected: after every 3rd level up to level 21, every 2nd level up to level 100, and every level after that.
* Harder clue types join at level 9 and at level 21. The same kind of clue does not come back within 10 levels.
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
At the top of `game.js`: tries per level, starting hints, the levels where harder clue types join, and so on.
After changing any file, raise `VERSION` in `sw.js` so installed copies update.

## Files
`index.html`, `style.css`, `game.js` (the game and all clue types), `sounds.js` (the same sounds and music as the live game),
`pictures/1-5.jpg` (backgrounds, smaller copies of the live game's pictures), `icons/`, `manifest.json` and `sw.js` (home-screen install and offline play).
