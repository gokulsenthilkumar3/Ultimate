Here's a full breakdown of what I'd prioritise across every dimension of the project — use the filter buttons to focus on specific categories.

**The highest-leverage moves right now, in order:**

**Kill tech debt first.** Delete `dashboard-app/` entirely and purge all remaining `userData.js` imports in favour of your Zustand store. This is holding back everything else and creates confusion for anyone reading the code.

**Fix navigation immediately.** 17 flat tabs is the single biggest UX problem. Grouping them into 5 categories (Body, Health, Lifestyle, Finance, Dev) with a sidebar would make the app feel intentional rather than experimental.

**Ship the onboarding wizard.** Right now a new user opens the app and sees someone else's body metrics. A 4-step first-run flow (name → metrics → goal → habits) transforms the experience instantly.

**Pull the AI Coach forward.** It's in your v2.2 roadmap but it's actually the easiest thing to build — you already have all the user data in Zustand, and the Claude API call is literally 15 lines. A chat tab that knows your sleep, body fat, and training schedule would make this app genuinely unique.

**For 3D:** Don't wait for real GLB assets. Load `Soldier.glb` from the Three.js CDN today, prove the morph slider wiring end-to-end, and add the `MeshReflectorMaterial` floor — three hours of work that makes the viewer look dramatically more premium.

**For integrations:** Supabase is the one that unlocks everything else. Your `VITE_API_BASE` env var is already wired — pointing it at Supabase gives you auth, cloud persistence, and the ability to sync across devices, which is the biggest practical gap in the app right now.

Want me to dive deep into any specific area — like writing the onboarding flow, the AI Coach tab, or the Supabase setup?
