# Ludo Debug Commands

Use this file as a copy/paste cheat sheet for browser console commands.

## 1) Open Game With Debug Mode

Enable debug from URL:

```text
http://127.0.0.1:5501/dist/game.html?debug=1
```

Disable debug from URL:

```text
http://127.0.0.1:5501/dist/game.html?debug=0
```

## 2) Base Debug Commands (Console)

```javascript
LudoDebug.help();
```

Show available debug methods.

```javascript
LudoDebug.status();
```

Show current turn, winners, playable colors, and dice state.

```javascript
LudoDebug.toggle(true);
```

Enable persistent debug mode (saved).

```javascript
LudoDebug.toggle(false);
```

Disable persistent debug mode.

```javascript
LudoDebug.reset();
```

Reset all tokens to home and refresh UI classes.

## 3) Dice Debug Commands (Console)

```javascript
LudoDebug.dice.state();
```

Show dice-related state.

```javascript
LudoDebug.dice.roll();
```

Roll dice normally (only if roll button is enabled).

```javascript
LudoDebug.dice.rollTo(1);
LudoDebug.dice.rollTo(2);
LudoDebug.dice.rollTo(3);
LudoDebug.dice.rollTo(4);
LudoDebug.dice.rollTo(5);
LudoDebug.dice.rollTo(6);
```

Force a specific roll value (1 to 6).

### Same-Number Animation Test

```javascript
LudoDebug.dice.rollTo(4);
LudoDebug.dice.rollTo(4);
```

Second call should animate as well, even when value is same as previous.

### Triple-6 Rule Test (Automated)

```javascript
await LudoDebug.dice.rollSeries([6, 6, 6]);
```

This helper auto-handles pending token selection and waits between rolls,
so you can test the 3rd-6 conversion rule in one command.

## 4) Board Scenario Commands

```javascript
LudoDebug.scenarios.overlap2();
```

Place 2 red tokens on same cell.

```javascript
LudoDebug.scenarios.overlap4();
```

Place 4 different-color tokens on same cell.

```javascript
LudoDebug.scenarios.captureTest();
```

Set up and test capture behavior.

```javascript
LudoDebug.scenarios.safeCellTest();
```

Set up and test safe-cell collision behavior.

## 5) Direct Utility Commands

```javascript
LudoDebug.placeTokenDirect("token-red-1", "c9");
LudoDebug.placeTokenDirect("token-red-1", "red", "c9");
```

Move a token directly to a board cell. Returns a result object.

```javascript
LudoDebug.collision("token-red-1", "red", "c9");
```

Run collision check manually.

---

## Notes

- If `LudoDebug` is undefined, refresh once with Ctrl+F5.
- If `LudoDebug.dice.roll()` returns disabled, it is not the current turn for rolling.
- URL `?debug=1` enables debug for the current session without forcing saved preference.
