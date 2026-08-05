---
name: AiDashboard XSS fix
description: Safe markdown rendering pattern and correct Gemini import path for AiDashboard
---

# AiDashboard — Security & Integration

**Why:** Code review rejected dangerouslySetInnerHTML for AI output (XSS risk); also rejected store-level askGemini lookup (it doesn't exist there).

## Safe markdown rendering
Replace `dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }}` with a `SafeMarkdown` React component that parses bold (`**`), inline code (`` ` ``), headings (`#`), bullet lists (`-`), and fenced code blocks into React elements only — never calls `innerHTML`.

## Correct Gemini import
```js
import { askGemini as firebaseAskGemini } from '../lib/firebase';
// then in sendMessage:
const response = await firebaseAskGemini(fullPrompt, model);
```
`askGemini` is exported from `growthtrack-ultimate/src/lib/firebase.js` line ~89. It is NOT on the Zustand store.

**How to apply:** Any new AI feature should import from `../lib/firebase`, not from the store. When Firebase creds are absent it returns null — show a graceful offline message.
