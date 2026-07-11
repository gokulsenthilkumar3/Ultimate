# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> GrowthTrack Ultimate E2E >> Navigation to Finance tab works
- Location: tests\e2e\app.spec.ts:21:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2:has-text("Financial Command")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h2:has-text("Financial Command")').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - progressbar "Step 1 of 3" [ref=e5]
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - img [ref=e13]
          - heading "Welcome to Ultimate" [level=2] [ref=e16]
        - paragraph [ref=e17]: Let's set up your digital twin profile.
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: What should we call you?
          - textbox "What should we call you?" [ref=e21]:
            - /placeholder: Your Name
        - generic [ref=e22]:
          - generic [ref=e23]: Biological Sex
          - combobox "Biological Sex" [ref=e24] [cursor=pointer]:
            - option "Male" [selected]
            - option "Female"
            - option "Non-binary"
            - option "Prefer not to say"
      - button "Next Step" [ref=e25] [cursor=pointer]:
        - text: Next Step
        - img [ref=e26]
  - generic [ref=e28]:
    - generic [ref=e29]: API OFFLINE
    - generic [ref=e31]:
      - banner [ref=e32]:
        - generic [ref=e33]:
          - img [ref=e35]
          - generic [ref=e37]:
            - heading "Ultimate" [level=1] [ref=e38]
            - paragraph [ref=e39]: Digital Twin v2.0
        - generic [ref=e40]:
          - generic [ref=e41]:
            - button "Gold theme" [ref=e42] [cursor=pointer]
            - button "Ocean theme" [ref=e43] [cursor=pointer]
            - button "Mint theme" [ref=e44] [cursor=pointer]
            - button "Violet theme" [ref=e45] [cursor=pointer]
            - button "Rose theme" [ref=e46] [cursor=pointer]
          - button "Quick Add" [ref=e48] [cursor=pointer]:
            - img [ref=e49]
          - button "Notifications" [ref=e50] [cursor=pointer]:
            - img [ref=e51]
          - 'generic "Health Score: 60/100" [ref=e55]':
            - img [ref=e56]
            - generic [ref=e59]: "60"
          - button "Open settings" [ref=e60] [cursor=pointer]:
            - img [ref=e61]
          - button "Toggle theme" [ref=e64] [cursor=pointer]:
            - img [ref=e65]
          - generic [ref=e67]:
            - generic [ref=e68]:
              - paragraph [ref=e69]: Athlete
              - paragraph [ref=e70]: Ultimate Plan
            - generic [ref=e71] [cursor=pointer]: G
      - main [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - paragraph [ref=e76]: "Systems Check: 12:19:07 PM"
              - heading "Good Afternoon, Operator" [level=2] [ref=e77]
              - paragraph [ref=e78]: Environment and physiology are within target operating ranges.
            - generic [ref=e79]:
              - paragraph [ref=e80]: Saturday, May 23, 2026
              - paragraph [ref=e81]: 12:19 PM
          - generic [ref=e82]:
            - generic [ref=e83]:
              - generic [ref=e84]:
                - img [ref=e86]
                - generic [ref=e88]: "+3"
              - paragraph [ref=e89]: Health Score
              - generic [ref=e90]:
                - generic [ref=e91]: "60"
                - generic [ref=e92]: /100
              - generic [ref=e95]: optimal
            - generic [ref=e96]:
              - generic [ref=e97]:
                - img [ref=e99]
                - generic [ref=e101]: "+0.5"
              - paragraph [ref=e102]: Weight
              - generic [ref=e103]:
                - generic [ref=e104]: "63.0"
                - generic [ref=e105]: kg
              - generic [ref=e108]: stable
            - generic [ref=e109]:
              - generic [ref=e110]:
                - img [ref=e112]
                - generic [ref=e115]: STABLE
              - paragraph [ref=e116]: BMI
              - generic [ref=e118]: "20.6"
              - generic [ref=e121]: normal
            - generic [ref=e122]:
              - generic [ref=e123]:
                - img [ref=e125]
                - generic [ref=e127]: "-1.2"
              - paragraph [ref=e128]: Body Fat
              - generic [ref=e129]:
                - generic [ref=e130]: "22"
                - generic [ref=e131]: "%"
              - generic [ref=e134]: cutting
          - generic [ref=e135]:
            - generic [ref=e136]:
              - generic [ref=e137]:
                - heading "Environmental Sensors" [level=3] [ref=e138]:
                  - img [ref=e139]
                  - text: Environmental Sensors
                - generic [ref=e142]: NOMINAL
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - paragraph [ref=e145]: Outside Temp
                  - generic [ref=e146]:
                    - img [ref=e147]
                    - generic [ref=e149]: 43°C
                - generic [ref=e150]:
                  - paragraph [ref=e151]: Humidity
                  - generic [ref=e152]:
                    - img [ref=e153]
                    - generic [ref=e155]: 16%
                - generic [ref=e156]:
                  - paragraph [ref=e157]: Wind Speed
                  - generic [ref=e158]:
                    - img [ref=e159]
                    - generic [ref=e163]: 19 km/h
                - generic [ref=e164]:
                  - paragraph [ref=e165]: Air Quality
                  - generic [ref=e166]:
                    - img [ref=e167]
                    - generic [ref=e171]: 68 (Mod)
                - generic [ref=e172]:
                  - paragraph [ref=e173]: UV Index
                  - generic [ref=e174]:
                    - img [ref=e175]
                    - generic [ref=e181]: 8 (High)
                - generic [ref=e182]:
                  - paragraph [ref=e183]: Wind Dir
                  - generic [ref=e184]:
                    - img [ref=e185]
                    - generic [ref=e188]: NNW
                - generic [ref=e189]:
                  - paragraph [ref=e190]: Pressure
                  - generic [ref=e191]:
                    - img [ref=e192]
                    - generic [ref=e195]: 979 hPa
                - generic [ref=e196]:
                  - paragraph [ref=e197]: Visibility
                  - generic [ref=e198]:
                    - img [ref=e199]
                    - generic [ref=e202]: 21.9 km
              - paragraph [ref=e204]:
                - img [ref=e205]
                - text: "All environmental sensors reporting within target thresholds. BMI stable at 20.6. Last weigh-in: Initial Profile."
            - generic [ref=e207]:
              - generic [ref=e208]:
                - heading "Strategic Priorities" [level=3] [ref=e209]:
                  - img [ref=e210]
                  - text: Strategic Priorities
                - generic [ref=e214]:
                  - generic [ref=e216]:
                    - generic [ref=e217]: Task Execution
                    - generic [ref=e218]: 0%
                  - generic [ref=e221]:
                    - generic [ref=e222]: Sleep Recovery
                    - generic [ref=e223]: 0%
                  - generic [ref=e226]:
                    - generic [ref=e227]: Daily Hydration
                    - generic [ref=e228]: 0%
              - generic [ref=e230]:
                - generic [ref=e231]:
                  - img [ref=e233]
                  - heading "Ambition Directive" [level=4] [ref=e236]
                - paragraph [ref=e237]: "\"The resistance you fight physically in the gym and the resistance you fight in life can only build a strong character.\""
    - navigation "Main navigation":
      - generic [ref=e238]:
        - generic [ref=e240]: Command
        - button "Overview" [ref=e241] [cursor=pointer]:
          - generic [ref=e242]: Overview
        - button "Dashboards" [ref=e243] [cursor=pointer]:
          - generic [ref=e244]: Dashboards
        - generic [ref=e246]: Physiology
        - button "3D Model" [ref=e247] [cursor=pointer]:
          - generic [ref=e248]: 3D Model
        - button "Blueprint" [ref=e249] [cursor=pointer]:
          - generic [ref=e250]: Blueprint
        - generic [ref=e252]: Lifestyle
        - button "Health+" [ref=e253] [cursor=pointer]:
          - generic [ref=e254]: Health+
        - generic [ref=e256]: Operations
        - button "Tasks" [ref=e257] [cursor=pointer]:
          - generic [ref=e258]: Tasks
        - button "Finance" [ref=e259] [cursor=pointer]:
          - generic [ref=e260]: Finance
        - generic [ref=e262]: System
        - button "App Hub" [ref=e263] [cursor=pointer]:
          - generic [ref=e264]: App Hub
        - button "🔔 Alerts" [ref=e265] [cursor=pointer]:
          - generic [ref=e266]: 🔔 Alerts
    - main [ref=e267]:
      - generic [ref=e268]:
        - generic [ref=e269]:
          - generic [ref=e270]:
            - paragraph [ref=e271]: "Systems Check: 12:19:07 PM"
            - heading "Good Afternoon, Operator" [level=2] [ref=e272]
            - paragraph [ref=e273]: Environment and physiology are within target operating ranges.
          - generic [ref=e274]:
            - paragraph [ref=e275]: Saturday, May 23, 2026
            - paragraph [ref=e276]: 12:19 PM
        - generic [ref=e277]:
          - generic [ref=e278]:
            - generic [ref=e279]:
              - img [ref=e281]
              - generic [ref=e283]: "+3"
            - paragraph [ref=e284]: Health Score
            - generic [ref=e285]:
              - generic [ref=e286]: "60"
              - generic [ref=e287]: /100
            - generic [ref=e290]: optimal
          - generic [ref=e291]:
            - generic [ref=e292]:
              - img [ref=e294]
              - generic [ref=e296]: "+0.5"
            - paragraph [ref=e297]: Weight
            - generic [ref=e298]:
              - generic [ref=e299]: "63.0"
              - generic [ref=e300]: kg
            - generic [ref=e303]: stable
          - generic [ref=e304]:
            - generic [ref=e305]:
              - img [ref=e307]
              - generic [ref=e310]: STABLE
            - paragraph [ref=e311]: BMI
            - generic [ref=e313]: "20.6"
            - generic [ref=e316]: normal
          - generic [ref=e317]:
            - generic [ref=e318]:
              - img [ref=e320]
              - generic [ref=e322]: "-1.2"
            - paragraph [ref=e323]: Body Fat
            - generic [ref=e324]:
              - generic [ref=e325]: "22"
              - generic [ref=e326]: "%"
            - generic [ref=e329]: cutting
        - generic [ref=e330]:
          - generic [ref=e331]:
            - generic [ref=e332]:
              - heading "Environmental Sensors" [level=3] [ref=e333]:
                - img [ref=e334]
                - text: Environmental Sensors
              - generic [ref=e337]: NOMINAL
            - generic [ref=e338]:
              - generic [ref=e339]:
                - paragraph [ref=e340]: Outside Temp
                - generic [ref=e341]:
                  - img [ref=e342]
                  - generic [ref=e344]: 43°C
              - generic [ref=e345]:
                - paragraph [ref=e346]: Humidity
                - generic [ref=e347]:
                  - img [ref=e348]
                  - generic [ref=e350]: 16%
              - generic [ref=e351]:
                - paragraph [ref=e352]: Wind Speed
                - generic [ref=e353]:
                  - img [ref=e354]
                  - generic [ref=e358]: 19 km/h
              - generic [ref=e359]:
                - paragraph [ref=e360]: Air Quality
                - generic [ref=e361]:
                  - img [ref=e362]
                  - generic [ref=e366]: 68 (Mod)
              - generic [ref=e367]:
                - paragraph [ref=e368]: UV Index
                - generic [ref=e369]:
                  - img [ref=e370]
                  - generic [ref=e376]: 8 (High)
              - generic [ref=e377]:
                - paragraph [ref=e378]: Wind Dir
                - generic [ref=e379]:
                  - img [ref=e380]
                  - generic [ref=e383]: NNW
              - generic [ref=e384]:
                - paragraph [ref=e385]: Pressure
                - generic [ref=e386]:
                  - img [ref=e387]
                  - generic [ref=e390]: 979 hPa
              - generic [ref=e391]:
                - paragraph [ref=e392]: Visibility
                - generic [ref=e393]:
                  - img [ref=e394]
                  - generic [ref=e397]: 21.9 km
            - paragraph [ref=e399]:
              - img [ref=e400]
              - text: "All environmental sensors reporting within target thresholds. BMI stable at 20.6. Last weigh-in: Initial Profile."
          - generic [ref=e402]:
            - generic [ref=e403]:
              - heading "Strategic Priorities" [level=3] [ref=e404]:
                - img [ref=e405]
                - text: Strategic Priorities
              - generic [ref=e409]:
                - generic [ref=e411]:
                  - generic [ref=e412]: Task Execution
                  - generic [ref=e413]: 0%
                - generic [ref=e416]:
                  - generic [ref=e417]: Sleep Recovery
                  - generic [ref=e418]: 0%
                - generic [ref=e421]:
                  - generic [ref=e422]: Daily Hydration
                  - generic [ref=e423]: 0%
            - generic [ref=e425]:
              - generic [ref=e426]:
                - img [ref=e428]
                - heading "Ambition Directive" [level=4] [ref=e431]
              - paragraph [ref=e432]: "\"The resistance you fight physically in the gym and the resistance you fight in life can only build a strong character.\""
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('GrowthTrack Ultimate E2E', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock the onboardingComplete state in localStorage so we don't hit the onboarding wizard
  6  |     await page.addInitScript(() => {
  7  |       localStorage.setItem('growthtrack-onboarding-complete', 'true');
  8  |     });
  9  |   });
  10 | 
  11 |   test('App loads and displays the overview tab by default', async ({ page }) => {
  12 |     await page.goto('/');
  13 | 
  14 |     // Check for the main title or the app header
  15 |     await expect(page.locator('text=Overview').first()).toBeVisible();
  16 |     
  17 |     // Ensure the fallback spinner resolves
  18 |     await expect(page.locator('.spinner')).not.toBeVisible();
  19 |   });
  20 | 
  21 |   test('Navigation to Finance tab works', async ({ page }) => {
  22 |     await page.goto('/');
  23 | 
  24 |     // Click the Finance tab
  25 |     await page.click('button:has-text("Finance")', { force: true });
  26 | 
  27 |     // Wait for the Finance tab to load and be visible
> 28 |     await expect(page.locator('h2:has-text("Financial Command")').first()).toBeVisible();
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  29 |   });
  30 | 
  31 |   test('Theme switching persists across reloads', async ({ page }) => {
  32 |     await page.goto('/');
  33 | 
  34 |     // Ensure the default theme is dark
  35 |     const html = page.locator('html');
  36 |     await expect(html).toHaveAttribute('data-theme', 'dark');
  37 | 
  38 |     // Currently the UI might not have a direct button exposed in the E2E without clicking settings
  39 |     // Alternatively, we can test state persistence by checking localStorage directly via page.evaluate
  40 |     const theme = await page.evaluate(() => {
  41 |       const state = JSON.parse(localStorage.getItem('growthtrack-ultimate-v4') || '{}');
  42 |       return state?.state?.theme;
  43 |     });
  44 |     
  45 |     expect(theme).toBe('dark');
  46 |   });
  47 | });
  48 | 
```