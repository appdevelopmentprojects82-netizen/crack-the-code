# Crack The Code — mobile

A phone puzzle game. Every level hides a 4-digit code in a coded clue.

* Each clue tile hides one digit (keyboard symbols, Morse, planets, Maya numbers, Braille, …).
* The player types a code. Green = right digit and right place, yellow = in the code but in the wrong place, grey = not in the code.
* 4 tries per level. A first-try crack gives ★★★ and a free hint.
* A hint explains the trick; a second hint shows one digit.
* Harder clue types join at level 9 and at level 21. The same kind of clue does not come back within 10 levels.
* Progress is saved on the phone.

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
