# Addition Practice

A tiny, dependency-free web page for school kids to practice addition of
numbers below 100.

## How it works

- A random addition problem (e.g. `27 + 12`) is shown, with both numbers and
  their sum always below 100.
- The player types the result and submits it (press Enter or click **Check**).
- The answer is validated immediately: correct answers advance to the next
  question, wrong answers prompt another try on the same question.
- A row of dots tracks the current correct-answer streak. After **5 correct
  answers in a row**, a hopping bunny animation plays as a reward, then the
  streak resets and practice continues.

## Running it

No build step or server is required. Just open `index.html` in a browser:

```bash
xdg-open addition-practice/index.html   # Linux
open addition-practice/index.html       # macOS
```

Or serve it locally, e.g. `python3 -m http.server` from this directory and
visit `http://localhost:8000`.
