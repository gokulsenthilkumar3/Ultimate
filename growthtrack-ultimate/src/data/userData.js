// ═══════════════════════════════════════════════════════════════════
// USER PROFILE — Gathered from comprehensive health assessment
// ═══════════════════════════════════════════════════════════════════
export const USER = {
  age: 23,
  born: "June 2003",
  height: 182,           // cm — corrected from DeepSeek input
  heightFt: "5'11.5\"",
  weight: 63,            // kg
  bmi: (63 / (1.82 * 1.82)).toFixed(1),   // ~19.0
  legHeight: 102,        // cm from ground to hip
  shoulderHeight: 150,   // cm from ground to shoulder

  // PE Targets (from claude.txt)
  currentLength: 5.9,
  currentGirth: 3.75,      // midpoint of 3.5"–4"
  targetLength: 7.9,
  targetGirth: 5.25,
  gainLength: 2.0,
  gainGirth: 1.5,
  timeframe: "6–12 months",
  sessionTime: "Morning / Night",
  trainingDays: 5,
  sessionDuration: "10–15 min",
  restDays: "Sat & Sun",

  // Lifestyle (claude.txt)
  lifestyle: "Sedentary (desk job/little movement)",
  diet: "Non-veg + veg mix — mostly home cooked + occasional junk food",
  waterIntake: "1–2 litres/day",
  sleepHours: "5–6 hrs",
  caffeine: "3+ coffees/day",
  negativeHabits: ["Excessive caffeine (3+ coffees/day)", "Late night eating"],
  concerns: ["High stress", "Sleep problems", "Asthma", "Dust/smoke/perfume allergies"],

  // Health Flags (claude.txt)
  energyLevel: "Fatigued most of the day",
  heartRate: "Never checked",
  bloodPressure: "Never checked",
  bloodwork: "Never done",
  urineColor: "Dark/yellow often (dehydration)",
  flexLevel: "Very stiff — cannot touch toes",

  // priorities
  priorities: [
    "Energy & hormones",
    "Internal health (organs, gut)",
    "Posture & joints",
    "Skin, hair & face",
    "Physical appearance (body)",
    "Sexual health (PE goals)",
  ],

  // Build
  bodyFat: "Under 10%",
  buildType: "Skinny-fat (low muscle, some fat)",
  desiredBuild: "Lean & Athletic (Greek God)",

  // Body Measurements — raw inputs from DeepSeek conversation
  // Height 182cm, measured in cm, converted to inches
  bodyMeasurements: {
    shoulders: {
      current_cm: 107.5, current_in: "42.3\"", target_in: "48–49\"",
      gap_in: "+5.7–6.7\"", priority: "#1 — KEY for V-taper",
      note: "Widening shoulders is the single biggest visual impact change"
    },
    chest: {
      current_cm: 86.5, current_in: "34.1\"", target_in: "42–44\"",
      gap_in: "+7.9–9.9\"", priority: "#2",
      note: "A larger chest creates the upper body mass needed for the aesthetic look"
    },
    waist: {
      current_cm: 82, current_in: "32.3\"", target_in: "30–31\"",
      gap_in: "-1.3–2.3\"", priority: "#3 — SHRINK",
      note: "A smaller waist makes your upper body look dramatically bigger"
    },
    arms: {
      current_cm: 30, current_in: "11.8\"", target_in: "16–16.5\"",
      gap_in: "+4.2–4.7\"", priority: "High Priority",
      note: "Triceps make up 2/3 of arm size — don't just train biceps"
    },
    forearms: {
      current_cm: 27, current_in: "10.6\"", target_in: "~13\"",
      gap_in: "+2.4\"", priority: "Medium",
      note: "Will grow naturally with pulling exercises and rows"
    },
    thighs: {
      current_cm: 53, current_in: "20.9\"", target_in: "24–25\"",
      gap_in: "+3.1–4.1\"", priority: "Medium",
      note: "Legs need 3–4 inches for a powerful, balanced physique"
    },
    calves: {
      current_cm: 35, current_in: "13.8\"", target_in: "15–16\"",
      gap_in: "+1.2–2.2\"", priority: "Lower",
      note: "Calves should roughly match your flexed arms for proportion"
    },
  },

  // Phases from DeepSeek
  phase1: {
    name: "Lean Bulk",
    duration: "8–12 months",
    weeklyGain: "0.25–0.5 kg/week",
    weightTarget: "70–73 kg",
    focus: "Progressive overload on compound lifts. Measurements follow strength.",
  },
  phase2: {
    name: "Cutting Phase",
    duration: "After sufficient muscle built",
    focus: "Slight calorie deficit, high protein, maintained training intensity",
    goal: "Reveal definition underneath",
  },
};

// ═══════════════════════════════════════════════════════════════════
// STATUS SYSTEM
// ═══════════════════════════════════════════════════════════════════
export const STATUS = {
  critical: { label: "Critical", color: "#ef4444", hex: 0xef4444, emissive: 0x550000, bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
  poor:     { label: "Poor",     color: "#f97316", hex: 0xf97316, emissive: 0x551400, bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.3)" },
  fair:     { label: "Fair",     color: "#eab308", hex: 0xeab308, emissive: 0x443300, bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.3)"  },
  good:     { label: "Good",     color: "#22c55e", hex: 0x22c55e, emissive: 0x0a3318, bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)"  },
};

export const DESIRED = { hex: 0x22d3ee, emissive: 0x003344 };

// ═══════════════════════════════════════════════════════════════════
// BODY PARTS — Full assessment from all 11 rounds of claude.txt Q&A
// ═══════════════════════════════════════════════════════════════════
export const BODY_PARTS = {
  // ── APPEARANCE ──────────────────────────────────────────────────
  head: {
    name: "Head, Face & Hair", status: "poor", sys: "appearance", icon: "👤",
    inputs: [
      "Acne, hard bumps, moles — multiple skin issues",
      "Uneven skin tone / oily skin",
      "Dandruff issues",
      "Receding hairline + slight hair thinning",
      "Weekly headaches from screen use",
    ],
    issues: [
      "Acne, pimples, hard bumps & moles (uneven tone)",
      "Dandruff — moderate to significant",
      "Receding hairline + thinning hair at 23",
      "Headaches 2×/week from screen exposure",
    ],
    fixes: [
      "Salicylic acid face wash twice daily (morning + night)",
      "Niacinamide serum for pores, tone & redness",
      "Ketoconazole anti-dandruff shampoo 2×/week",
      "Dermatologist consult for moles + hormonal acne",
      "Minoxidil (5%) if hairline concern is urgent — consult doctor",
      "20‑20‑20 rule for headaches: every 20 mins, look 20ft away for 20 sec",
    ],
  },
  eyes: {
    name: "Eyes & Vision", status: "poor", sys: "appearance", icon: "👁️",
    inputs: [
      "Slightly blurry vision — wears glasses/lenses",
      "Severe eye strain and screen fatigue every day",
    ],
    issues: [
      "Refractive error (glasses/lenses user)",
      "Daily digital eye strain — symptomatic",
      "Screen fatigue causing headaches",
    ],
    fixes: [
      "20‑20‑20 rule — every 20 min, 20ft away, 20 sec",
      "Blue light filter glasses for evening/night use",
      "Preservative-free lubricating eye drops",
      "No screens at least 1 hour before sleep",
      "Annual vision checkup — prescription may have changed",
    ],
  },
  oral: {
    name: "Teeth, Gums & Breath", status: "poor", sys: "appearance", icon: "🦷",
    inputs: [
      "Yellow/stained teeth",
      "Gum bleeding — regular",
      "Bad breath (halitosis)",
      "Occasional tooth sensitivity",
    ],
    issues: [
      "Yellow staining — likely from 3+ coffees/day",
      "Bleeding gums = early gingivitis",
      "Chronic bad breath from gut + oral bacteria",
      "Sensitivity suggests weakened enamel",
    ],
    fixes: [
      "Electric toothbrush + floss every single day — non-negotiable",
      "Tongue scraper morning & night (fixes 80% of bad breath)",
      "Oil pulling 10 min/day with coconut oil",
      "Reduce coffee — it stains and dries out mouth",
      "Dentist visit ASAP — gum bleeding needs professional cleaning",
    ],
  },

  // ── JOINTS / POSTURE ────────────────────────────────────────────
  neck: {
    name: "Neck & Cervical Spine", status: "poor", sys: "joints", icon: "🔴",
    inputs: [
      "Forward head posture",
      "Neck/shoulder stiffness — chronic",
      "Tech neck from desk job",
    ],
    issues: [
      "Forward head posture — significant (desk job)",
      "Neck stiffness every day",
      "Contributes to weekly headaches",
    ],
    fixes: [
      "Chin tucks 3×10 reps every hour at desk",
      "Raise monitor to eye level using a stand",
      "Neck mobility circles every morning (2 min)",
      "Posture reminder app — hourly alerts",
    ],
  },
  spine: {
    name: "Spine, Back & Posture", status: "poor", sys: "joints", icon: "🦴",
    inputs: [
      "Weak/hunched back (Rounds/Lats/Traps underdeveloped)",
      "Lower back pain",
      "Forward head posture",
      "Multiple posture issues",
    ],
    issues: [
      "Rounded upper back — kyphosis pattern",
      "Lower back pain — worsened by weak core",
      "Weak spinal erectors from desk posture",
    ],
    fixes: [
      "Lumbar support cushion for chair — immediate purchase",
      "Cat‑cow stretches every morning (2 min)",
      "Thoracic extension over foam roller or chair back",
      "Dead hangs 3×30 sec daily — decompresses discs",
      "Strengthen with Lat Pulldowns, Rows once training begins",
    ],
  },
  knees: {
    name: "Knees & Lower Joints", status: "poor", sys: "joints", icon: "🦵",
    inputs: [
      "Occasional knee pain",
      "Multiple joint issues",
      "Wrist/elbow pain from desk work",
    ],
    issues: [
      "Occasional knee pain — possible patellar tracking issue",
      "Wrist pain from prolonged typing",
      "Elbow pain — possible mild tendinopathy",
      "General joint stiffness body-wide",
    ],
    fixes: [
      "VMO exercise: terminal knee extensions (mini band)",
      "Omega-3 fish oil 2–3g/day — reduces joint inflammation",
      "Ice 15 min after any painful activity",
      "Wrist flexor & extensor stretch 3×/day at desk",
      "Avoid deep squats until knee pain resolves",
      "Grip strengthener for wrist rehab",
    ],
  },

  // ── MUSCLES ────────────────────────────────────────────────────
  chest: {
    name: "Chest (Pectorals)", status: "fair", sys: "muscles", icon: "💪",
    inputs: ["Slightly developed — not significant", "Breathing issues from asthma limit chest expansion"],
    issues: [
      "Underdeveloped pectorals",
      "Current: 86.5cm (34.1\") — Target: 42–44\"",
      "Asthma reduces breathing capacity during exercise",
    ],
    fixes: [
      "Incline push-ups → floor push-ups progression",
      "Resistance band chest press (home-friendly)",
      "Door frame chest stretch daily",
      "Diaphragm breathing exercises 5 min/day",
      "Ask GP for exercise-induced asthma management plan",
    ],
  },
  shoulders: {
    name: "Shoulders (Deltoids)", status: "fair", sys: "muscles", icon: "🔵",
    inputs: ["Slightly broad — not significantly developed", "Rounded shoulder posture"],
    issues: [
      "Currently 107.5cm (42.3\") — Target: 48–49\" (+6.7\")",
      "Rounded forward posture worsens appearance",
      "Stiffness from desk sitting",
      "Priority #1 for Greek God V-taper",
    ],
    fixes: [
      "Lateral raises with resistance band or light dumbbells — 4×15 daily",
      "Overhead press: start light, progress weekly",
      "Wall angels 3×10 daily for posture",
      "Face pulls (band) to fix rounded shoulders",
      "Doorway chest stretch daily",
    ],
  },
  arms: {
    name: "Arms & Wrists", status: "fair", sys: "muscles", icon: "💪",
    inputs: [
      "Slightly defined — above average for sedentary",
      "Currently 30cm (11.8\") — Target: 16–16.5\"",
      "Wrist pain from desk work",
    ],
    issues: [
      "Arms need +4.5\" of muscle development",
      "Wrist pain limits loading",
      "Forearms 27cm (10.6\") — Target: ~13\"",
    ],
    fixes: [
      "Bicep curls: start with light dumbbells or bands 3×10",
      "Tricep dips using chair (2/3 of arm size!)",
      "Wrist flexor/extensor rehab stretches 3×/day",
      "Grip strengthener device daily",
      "Progress slowly — avoid wrist strain",
    ],
  },
  core: {
    name: "Core & Abs", status: "critical", sys: "muscles", icon: "⚠️",
    inputs: ["Very weak / no definition", "Weak core worsening lower back pain"],
    issues: [
      "Critically weak — worst single body area",
      "Zero ab definition",
      "Directly causing and worsening lower back pain",
      "Weak core = poor posture = joint cascade",
    ],
    fixes: [
      "Dead bug 3×8 reps — safest beginner core move",
      "Plank: start 3×10 sec, add 5 sec every week",
      "Bird dog 3×10 each side — lumbar stabilizer",
      "McGill Big 3 protocol (dead bug, bird dog, side plank)",
      "NEVER do crunches with back pain — use McGill protocol only",
    ],
  },
  glutes: {
    name: "Glutes (Buttocks)", status: "good", sys: "muscles", icon: "✅",
    inputs: ["Well developed — your best current muscle group"],
    issues: ["Minor size imbalance possible"],
    fixes: [
      "Maintain with hip thrusts & Bulgarian split squats",
      "Single-leg glute bridges for symmetry",
      "Continue building as legs develop",
    ],
  },
  legs: {
    name: "Legs (Quads, Hamstrings, Calves)", status: "fair", sys: "muscles", icon: "🦵",
    inputs: ["Fatty and undefined (not lean)", "Very poor flexibility — can't touch toes"],
    issues: [
      "Thighs: 53cm (20.9\") — Target: 24–25\" (+4\")",
      "Calves: 35cm (13.8\") — Target: 15–16\" (+2\")",
      "Can't touch toes — extreme inflexibility",
    ],
    fixes: [
      "Bodyweight squats 3×15 to build quad base",
      "Calf raises 3×20 daily",
      "Hamstring stretch 3×30 sec after every session",
      "Foam roll quads & IT band 3×/week",
      "Lunges 3×10 each leg for quad/glute balance",
    ],
  },

  // ── ORGANS ────────────────────────────────────────────────────
  lungs: {
    name: "Lungs & Respiratory", status: "poor", sys: "organs", icon: "🫁",
    inputs: ["Asthma — diagnosed", "Gets breathless climbing stairs", "Dust/smoke/perfume triggers"],
    issues: [
      "Diagnosed asthma — exercise tolerance limited",
      "Severely poor cardio — breathless on stairs only",
      "Allergen triggers: dust, smoke, perfume/strong smells",
      "Constant runny nose from allergies",
    ],
    fixes: [
      "Always carry inhaler — use 15 min before exercise",
      "HEPA air purifier for bedroom (game changer)",
      "Daily nasal antihistamine tablet",
      "Diaphragm breathing exercises 5 min/day",
      "Nasal rinse (neti pot) for congestion",
      "Avoid exercise in dusty/smoky environments",
    ],
  },
  heart: {
    name: "Heart & Cardiovascular", status: "poor", sys: "organs", icon: "🫀",
    inputs: [
      "Gets breathless climbing stairs",
      "Heart rate never checked",
      "Blood pressure never checked",
      "3+ coffees/day straining the system",
    ],
    issues: [
      "Severely poor cardiovascular fitness",
      "Blood pressure & heart rate are unknown — potential silent risk",
      "Excessive caffeine elevating resting heart rate",
      "Zero cardiovascular training currently",
    ],
    fixes: [
      "Start 10-min walks daily — begin THIS week",
      "Buy a BP monitor (~₹1000) — measure morning & evening",
      "Measure resting heart rate on waking — track weekly",
      "Cut to max 2 coffees/day, both before noon",
      "Build to 30-min Zone 2 cardio over 2 months (walk → jog)",
    ],
  },
  gut: {
    name: "Gut & Digestive System", status: "poor", sys: "organs", icon: "🫃",
    inputs: [
      "Frequent bloating — daily",
      "Indigestion after every meal",
      "Constipation is common",
      "Only drinking 1–2L water/day",
      "Late night eating habit",
    ],
    issues: [
      "Daily bloating after every meal",
      "Constipation — chronic dehydration contributing",
      "Indigestion — likely gut microbiome dysbiosis",
      "Late night eating disrupting digestion & sleep",
    ],
    fixes: [
      "Drink 3L water daily — START immediately, most impactful fix",
      "Probiotic every morning (Greek yogurt or capsule)",
      "Chew each bite 20× — slow down eating speed",
      "Last meal strictly 3 hours before bedtime",
      "Ginger or peppermint tea after meals for bloating",
      "Add fiber: oats, vegetables, lentils daily",
    ],
  },
  liver: {
    name: "Liver", status: "fair", sys: "organs", icon: "🟡",
    inputs: ["Never had bloodwork", "3+ coffees/day", "Late night eating"],
    issues: [
      "Liver function unknown — no bloodwork ever done",
      "3+ coffees/day creating extra detox load",
      "Late night eating stresses liver overnight",
    ],
    fixes: [
      "Get LFT (Liver Function Test) bloodwork ASAP",
      "Max 2 coffees/day, before noon only",
      "Milk thistle supplement daily (liver protector)",
      "Hydration: 3L/day reduces liver load significantly",
      "No food 3+ hours before sleep",
    ],
  },
  kidneys: {
    name: "Kidneys", status: "fair", sys: "organs", icon: "🟠",
    inputs: ["Dark/yellow urine often", "Never had bloodwork done"],
    issues: [
      "Dark yellow urine = chronic dehydration",
      "Kidney function never tested",
      "Dehydration increases kidney stone risk over time",
    ],
    fixes: [
      "Drink 3L water daily — morning urine should be pale yellow",
      "Get creatinine + GFR bloodwork done",
      "Avoid excess ibuprofen/NSAIDs (kidney strain)",
      "Add lemon to water — citrate reduces stone risk",
    ],
  },
  hormones: {
    name: "Hormones & Endocrine System", status: "poor", sys: "organs", icon: "⚡",
    inputs: [
      "Mood swings & emotional imbalance",
      "Fatigue + brain fog (possible low testosterone)",
      "Low libido / low drive",
    ],
    issues: [
      "Possible low testosterone at age 23 — very concerning",
      "Mood instability affecting daily life",
      "Brain fog + fatigue every day",
      "Low libido — linked to sleep deprivation + stress",
    ],
    fixes: [
      "Get testosterone blood test THIS WEEK — urgent priority",
      "Sleep 8 hours — #1 natural testosterone booster",
      "Zinc: pumpkin seeds, oysters, red meat (T-booster)",
      "Resistance training 3×/week — proven testosterone elevator",
      "5-min breathing exercise to reduce cortisol daily",
      "Reduce caffeine — chronically elevates cortisol",
    ],
  },
  immune: {
    name: "Immune System", status: "poor", sys: "organs", icon: "🛡️",
    inputs: [
      "Frequent allergy: dust, smoke, perfume/strong smells",
      "Non-stop running nose from allergens",
      "Headaches 2×/week from screen + allergy",
      "Sleep deprivation weakening immune system",
    ],
    issues: [
      "Dust, smoke, perfume allergies — severe",
      "Chronic rhinitis (running nose)",
      "Sleep deprivation suppressing immune response nightly",
      "Headaches 2×/week from combined allergen + screen load",
    ],
    fixes: [
      "HEPA air purifier for room + workspace — essential purchase",
      "Daily antihistamine tablet (Cetirizine or Loratadine)",
      "Neti pot for nasal irrigation",
      "Vitamin D3 5000 IU + Zinc supplement daily",
      "Fix sleep — immune system rebuilds mostly at night",
      "Keep windows closed during high pollen/dust periods",
    ],
  },

  // ── SEXUAL ────────────────────────────────────────────────────
  pe: {
    name: "Sexual Health & PE Goals", status: "fair", sys: "sexual", icon: "⚡",
    inputs: [
      "Current length: 5.9\"",
      "Current girth: 3.5–4\" (mid: 3.75\")",
      "Target: +2\" length, +1.5\" girth",
      "Timeline: 6–12 months",
      "Methods: manual only, no devices/surgery",
    ],
    issues: [
      "Current: 5.9\" × 3.75\" → Target: 7.9\" × 5.25\"",
      "Low libido linked to hormonal imbalance",
      "High stress + poor sleep directly limiting gains",
    ],
    fixes: [
      "Follow 5-day manual PE routine consistently",
      "Fix testosterone first — libido depends on it",
      "Daily Kegels at desk (nobody can tell)",
      "Never skip warm-up — prevents micro-tear injury",
      "Hydration: dehydration reduces tissue elasticity",
    ],
  },
  skin: {
    name: "Skin (Full Body)", status: "poor", sys: "appearance", icon: "✨",
    inputs: ["Acne, hard bumps, moles, uneven tone", "Oily skin"],
    issues: [
      "Acne & hard bumps — likely hormonal",
      "Moles — need professional dermatologist assessment",
      "Uneven skin tone — hyperpigmentation",
      "Oily skin type",
    ],
    fixes: [
      "Salicylic acid face wash twice daily",
      "Niacinamide serum for pores, oil control & tone",
      "SPF 30+ sunscreen every single morning",
      "Dermatologist for moles & hormonal acne",
      "No touching face during the day",
      "Pillowcase change every 2–3 days",
    ],
  },
};

// Compute health score
export const HEALTH_SCORE = Math.round(
  Object.values(BODY_PARTS)
    .map(p => ({ critical: 14, poor: 36, fair: 60, good: 84 }[p.status] || 50))
    .reduce((a, b) => a + b, 0) / Object.keys(BODY_PARTS).length
);

// ═══════════════════════════════════════════════════════════════════
// HEALTH Q&A — All questions and answers from claude.txt (11 rounds)
// ═══════════════════════════════════════════════════════════════════
export const HEALTH_QA = [
  {
    round: "Round 1 — Goals & Method",
    color: "#f59e0b",
    items: [
      { q: "Primary PE goal?",            a: "Both length & girth" },
      { q: "Methods?",                    a: "Manual only — NO surgery, medication, or devices" },
      { q: "Experience level?",           a: "Complete beginner" },
      { q: "Time per day?",               a: "10–15 minutes" },
      { q: "Days per week?",              a: "5 days (Mon–Fri)" },
    ],
  },
  {
    round: "Round 2 — Body Composition",
    color: "#06b6d4",
    items: [
      { q: "Body fat?",                   a: "Under 10% (visible abs, very lean)" },
      { q: "Current build?",              a: "Skinny-fat — low muscle, some fat" },
      { q: "Desired body type?",          a: "Lean & athletic (Greek God profile)" },
    ],
  },
  {
    round: "Round 3 — Upper Body Muscles",
    color: "#8b5cf6",
    items: [
      { q: "Chest development?",          a: "Slightly developed" },
      { q: "Shoulders?",                  a: "Slightly broad — not significantly developed" },
      { q: "Arms (biceps & triceps)?",    a: "Slightly defined" },
    ],
  },
  {
    round: "Round 4 — Core & Back",
    color: "#ef4444",
    items: [
      { q: "Core / abs?",                 a: "Very weak — no definition (critical area)" },
      { q: "Back (lats, traps)?",         a: "Weak / hunched posture" },
      { q: "Posture issues?",             a: "Forward head posture + multiple issues" },
    ],
  },
  {
    round: "Round 5 — Lower Body",
    color: "#10b981",
    items: [
      { q: "Legs (quads, hamstrings)?",   a: "Fatty and undefined — not lean" },
      { q: "Glutes?",                     a: "Well developed — your strongest body area" },
      { q: "Flexibility?",                a: "Very stiff — cannot touch toes" },
    ],
  },
  {
    round: "Round 6 — Cardiovascular",
    color: "#f97316",
    items: [
      { q: "Cardio endurance?",           a: "Gets breathless climbing stairs" },
      { q: "Resting heart rate?",         a: "Never checked" },
      { q: "Respiratory issues?",         a: "Asthma — diagnosed condition" },
    ],
  },
  {
    round: "Round 7 — Gut Health",
    color: "#22d3ee",
    items: [
      { q: "Gut health?",                 a: "Frequent bloating + irregular/constipation" },
      { q: "Bloating after meals?",       a: "Yes — daily, after every meal" },
      { q: "Daily water intake?",         a: "Only 1–2 litres (very low)" },
    ],
  },
  {
    round: "Round 8 — Skin, Hair & Eyes",
    color: "#a78bfa",
    items: [
      { q: "Skin condition?",             a: "Acne, pimples, hard bumps, moles, uneven tone" },
      { q: "Hair health?",                a: "Dandruff + receding hairline + slight thinning" },
      { q: "Eyes?",                       a: "Blurry (glasses user) + severe daily eye strain" },
    ],
  },
  {
    round: "Round 9 — Oral, Bones & Joints",
    color: "#fb923c",
    items: [
      { q: "Oral/dental health?",         a: "Yellow teeth + gum bleeding + bad breath + sensitivity" },
      { q: "Joint or bone pain?",         a: "Knee pain, lower back pain, neck stiffness, wrist/elbow pain" },
      { q: "Daily energy levels?",        a: "Fatigued most of the day" },
    ],
  },
  {
    round: "Round 10 — Internal Organs & Blood",
    color: "#34d399",
    items: [
      { q: "Blood pressure?",             a: "Never checked" },
      { q: "Kidney/liver concerns?",      a: "Dark/yellow urine + no bloodwork ever done" },
      { q: "Immune system?",              a: "Frequent dust/smoke/perfume allergies + non-stop runny nose + headaches 2×/week" },
    ],
  },
  {
    round: "Round 11 — Hormones, Sleep & Diet",
    color: "#f43f5e",
    items: [
      { q: "Hormonal signs?",             a: "Mood swings + fatigue/brain fog (possible low T) + low libido" },
      { q: "Sleep?",                      a: "5–6 hours/night (severely insufficient)" },
      { q: "Diet?",                       a: "Non-veg + veg mix — home cooked + occasional junk" },
      { q: "Negative habits?",            a: "Excessive caffeine (3+ coffees/day) + late night eating" },
      { q: "Top priorities?",             a: "Energy/hormones → organs/gut → posture/joints → skin/hair → body → PE" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// GOLDEN RATIO ANALYSIS — From DeepSeek
// ═══════════════════════════════════════════════════════════════════
export const GOLDEN_RATIO = {
  title: "Greek God Golden Ratio Analysis",
  source: "DeepSeek body composition analysis",
  height_cm: 182,
  weight_kg: 63,
  bmi: 19.0,
  table: [
    { part: "Shoulders",  current_cm: "107.5", current_in: "42.3\"", target_in: "48–49\"", gap: "+5.7–6.7\"", priority: "🏆 #1",    color: "#ef4444" },
    { part: "Chest",      current_cm: "86.5",  current_in: "34.1\"", target_in: "42–44\"", gap: "+7.9–9.9\"", priority: "🥈 #2",    color: "#f97316" },
    { part: "Waist",      current_cm: "82.0",  current_in: "32.3\"", target_in: "30–31\"", gap: "–1.3–2.3\"",priority: "🥉 #3 SHRINK", color: "#eab308" },
    { part: "Arms",       current_cm: "30.0",  current_in: "11.8\"", target_in: "16–16.5\"",gap: "+4.2–4.7\"",priority: "🔥 High",  color: "#22c55e" },
    { part: "Forearms",   current_cm: "27.0",  current_in: "10.6\"", target_in: "~13\"",   gap: "+2.4\"",     priority: "Medium",   color: "#06b6d4" },
    { part: "Thighs",     current_cm: "53.0",  current_in: "20.9\"", target_in: "24–25\"", gap: "+3.1–4.1\"", priority: "Medium",   color: "#8b5cf6" },
    { part: "Calves",     current_cm: "35.0",  current_in: "13.8\"", target_in: "15–16\"", gap: "+1.2–2.2\"", priority: "Lower",    color: "#64748b" },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// PE EXERCISES
// ═══════════════════════════════════════════════════════════════════
export const PE_EXERCISES = [
  { id: 1, icon: "🔥", name: "Hot Warm-Up", duration: "2 min", target: "Preparation", color: "#f59e0b", reps: null,
    steps: ["Soak washcloth in warm water", "Wrap around shaft 60 sec", "Re-soak & repeat", "OR: Warm shower 2 mins"],
    tips: ["Never burning hot", "Do it EVERY session"], benefit: "Increases elasticity, stops injury" },
  { id: 2, icon: "↔️", name: "Manual Stretch", duration: "4 min", target: "Length", color: "#06b6d4", reps: "4 dir × 30s",
    steps: ["Stay completely flaccid", "Grip firmly below glans", "Stretch outward, hold 30s", "Repeat Down, Left, Right"],
    tips: ["Never stretch erect", "Pain = STOP immediately"], benefit: "Elongates tunica over time" },
  { id: 3, icon: "💪", name: "Jelqing", duration: "5 min", target: "Length & Girth", color: "#10b981", reps: "50-75 reps",
    steps: ["Must be 50–70% erect", "Form OK-grip at base", "Slide to glans slowly (3s)", "Alternate hands, continuous"],
    tips: ["Use coconut oil/lube", "Start 50 reps/day (Wk 1)"], benefit: "Expands penile chambers" },
  { id: 4, icon: "⚡", name: "Kegel Training", duration: "3 min", target: "EQ Control", color: "#8b5cf6", reps: "3×10 reps",
    steps: ["Flex PC muscle (stop-pee muscle)", "Contract hard, hold 3s", "Release completely 3s", "Rest 30s between sets"],
    tips: ["Don't hold your breath", "Do at desk anytime"], benefit: "Improves hardness & stamina" },
  { id: 5, icon: "🧊", name: "Warm-Down", duration: "2 min", target: "Recovery", color: "#64748b", reps: null,
    steps: ["Repeat warm cloth wrap", "Light massage for 1 min", "Done!"],
    tips: ["Never skip to grow", "Take Sat/Sun off"], benefit: "Flushes lactic acid, speeds healing" },
];

// ═══════════════════════════════════════════════════════════════════
// LIFESTYLE TIPS
// ═══════════════════════════════════════════════════════════════════
export const LIFESTYLE_TIPS = [
  { icon: "😴", title: "Fix Your Sleep", color: "#8b5cf6", urgency: "CRITICAL",
    points: ["Current: 5–6 hrs (Suppresses Testosterone)", "Goal: 7–9 hrs (80% of repair occurs here)", "Action: Cool room 18°C, NO screens 1hr before bed"] },
  { icon: "🧘", title: "Stress Management", color: "#ef4444", urgency: "CRITICAL",
    points: ["High Cortisol = Low Blood Flow & Low Test", "Action: 5-min Box Breathing (4-4-4-4) daily", "Action: 10 mins morning sunlight"] },
  { icon: "☕", title: "Reduce Caffeine", color: "#f97316", urgency: "HIGH IMPACT",
    points: ["Current: 3+ cups (Strains liver, wrecks sleep)", "Goal: Max 2 cups, stop at 12 PM", "Action: Switch to green tea after 12 PM"] },
  { icon: "🚶", title: "Daily Movement", color: "#f59e0b", urgency: "RECOMMENDED",
    points: ["Current: Sedentary desk job", "Action: 20-min daily walk", "Benefit: Massively increases blood flow for PE and gut"] },
  { icon: "🥩", title: "Nutrition", color: "#10b981", urgency: "RECOMMENDED",
    points: ["Goal: 2500-2700 cal, 130g protein", "Key nutrients: Zinc, L-arginine (meat, nuts)", "Benefit: Direct testosterone and muscle support"] },
  { icon: "💧", title: "Hydration 3L", color: "#06b6d4", urgency: "URGENT",
    points: ["Current: 1-2L (Dark urine, constipation risk)", "Goal: 3 Liters daily strictly", "Action: Drink 500ml immediately upon waking"] },
  { icon: "🚫", title: "Hard NOs", color: "#f43f5e", urgency: "WARNING",
    points: ["Never drink alcohol night before PE training", "Never drink caffeine 30 mins before training", "Never skip warm-ups or train through pain", "No food after 8 PM"] },
];

// ═══════════════════════════════════════════════════════════════════
// NUTRITION — Budget diet plan from DeepSeek
// ═══════════════════════════════════════════════════════════════════
export const NUTRITION = {
  calories: "2500–2700 cal/day",
  caloriesNote: "Start at 2500. If not gaining 0.5kg/week after 2 weeks, increase to 2700.",
  protein: "125–140g/day (2g per kg bodyweight)",
  carbs: "Fill remaining calories — fuel for workouts",
  fats: "Support hormone production (testosterone needs dietary fat)",
  phase: "Lean Bulk (Phase 1 — 8–12 months)",
  targetWeight: "70–73 kg",
  weeklyGain: "0.25–0.5 kg/week",
  meals: [
    { name: "Breakfast", time: "~500 cal · 30g protein", icon: "🌅",
      items: ["1 cup Oats made with 1.5 cups Milk (~200 cal, 15g protein)",
              "2 whole eggs + 2 egg whites scrambled (~180 cal, 20g protein)",
              "Optional: banana or 2 slices whole grain toast"] },
    { name: "Lunch", time: "~600 cal · 40g protein", icon: "☀️",
      items: ["150g Chicken thigh (raw) — baked/pan-fried (~250 cal, 28g protein)",
              "1.5 cups cooked Rice (~300 cal, 6g protein)",
              "Large portion steamed vegetables (broccoli, carrots)"] },
    { name: "Snack", time: "~300 cal · 20g protein", icon: "🍌",
      items: ["200g Greek Yogurt (~120 cal, 20g protein)",
              "1 Banana (~90 cal)",
              "Handful of peanuts (~90 cal, 4g protein)"] },
    { name: "Dinner", time: "~600 cal · 40g protein", icon: "🌙",
      items: ["Large Lentil Curry (1 cup dry lentils) OR 3-egg omelet with cheese",
              "1 cup cooked Pasta OR 2 slices whole grain bread",
              "Side salad with olive oil dressing"] },
    { name: "Post-Workout (optional)", time: "~200 cal · 25g protein", icon: "💪",
      items: ["1 scoop Whey Protein with water",
              "Total daily: ~2200 base. Add larger portions to hit 2500–2700."] },
  ],
  staples: {
    protein: ["Chicken Thighs/Legs (cheaper than breast)", "Eggs (don't fear the yolk)", "Canned Tuna/Sardines", "Milk & Greek Yogurt", "Lentils & Beans (pair with rice for complete protein)", "Whey Protein Powder (optional supplement)"],
    carbs: ["Oats (king of budget bodybuilding carbs)", "Rice — buy in bulk", "Whole wheat Pasta", "Potatoes & Sweet Potatoes", "Whole grain Bread"],
    fats: ["Olive oil / Canola oil for cooking", "Peanut Butter (high cal + protein)", "Nuts & Seeds (buy in bulk)"],
  },
  avoidForWaist: ["Heavy oblique exercises like side bends — thickens waist", "Excess processed sugar", "Alcohol", "Liquid calories beyond milk/protein"],
};

// ═══════════════════════════════════════════════════════════════════
// TRAINING PLAN — From DeepSeek with specific reps/sets
// ═══════════════════════════════════════════════════════════════════
export const TRAINING_PLAN = {
  split: "Push / Pull / Legs (PPL)",
  schedule: "3 days on, 1 day off — repeat",
  scheduleNote: "Consistency is your most powerful tool. Train 3 days on, 1 day off, repeat — hit each muscle group twice per week.",
  days: {
    push: "Chest, Shoulders, Triceps",
    pull: "Back, Biceps, Rear Delts",
    legs: "Quads, Hamstrings, Calves, Abs",
  },
  priority_exercises: [
    {
      area: "🏆 Wider Shoulders (Priority #1)",
      note: "The single most impactful change for the V-taper look",
      exercises: [
        { name: "Overhead Press (Barbell or Dumbbell)", sets: "3 × 5–8 reps", type: "Compound — progressive overload focus" },
        { name: "Lateral Raises (Dumbbells or Band)", sets: "4 × 12–15 reps", type: "Non-negotiable. Feel the side delt burn." },
      ],
    },
    {
      area: "🥈 Bigger Chest (Priority #2)",
      note: "Core mass builder for upper body presence",
      exercises: [
        { name: "Flat Barbell Bench Press", sets: "3 × 5–8 reps", type: "Compound — main chest builder" },
        { name: "Incline Dumbbell Press", sets: "3 × 8–12 reps", type: "Upper chest for full development" },
        { name: "Chest Flyes (cable or dumbbell)", sets: "3 × 12–15 reps", type: "Isolation for stretch and shape" },
      ],
    },
    {
      area: "🥉 Smaller Waist & Broader Back (Priority #3)",
      note: "Wide back + smaller waist = dramatic V-taper. AVOID heavy oblique work.",
      exercises: [
        { name: "Pull-Ups or Lat Pulldowns", sets: "3 × failure or 8–12 reps", type: "Primary lat builder" },
        { name: "Bent-Over Rows (Barbell)", sets: "3 × 5–8 reps", type: "Back thickness and strength" },
      ],
    },
    {
      area: "🔥 Bigger Arms (High Priority)",
      note: "Triceps = 2/3 of arm size. Train triceps as much as biceps.",
      exercises: [
        { name: "Barbell Curls", sets: "3 × 8–12 reps", type: "Biceps — compound curl" },
        { name: "Dumbbell Curls", sets: "3 × 10–15 reps", type: "Biceps — isolation" },
        { name: "Tricep Pushdowns (cable or band)", sets: "3 × 10–15 reps", type: "Triceps — isolation" },
        { name: "Overhead Tricep Extensions", sets: "3 × 10–15 reps", type: "Triceps — long head stretch" },
      ],
    },
    {
      area: "Legs & Core",
      note: "Legs for proportion. Core for posture, back pain, and athleticism.",
      exercises: [
        { name: "Barbell Back Squat", sets: "3 × 5–8 reps", type: "Primary leg compound" },
        { name: "Deadlift", sets: "3 × 5 reps", type: "Full posterior chain — king of mass builders" },
        { name: "Calf Raises", sets: "4 × 15–20 reps", type: "Calf development" },
        { name: "Plank / Dead Bug / Bird Dog", sets: "McGill Big 3: 3 sets each", type: "Core stability — safe for back pain" },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const ACTIVE_DAYS = [true, true, true, true, true, false, false];
export const WEEK_LABELS = Array.from({ length: 24 }, (_, i) => `Week ${i + 1}`);

// ═══════════════════════════════════════════════════════════════════
// MEDICAL & BLOODWORK DATA
// ═══════════════════════════════════════════════════════════════════
export const MEDICAL_DATA = {
  testsRequired: [
    { name: "Total Testosterone", priority: "URGENT", reason: "Fatigue, low mood, low libido at 23" },
    { name: "Free Testosterone", priority: "URGENT", reason: "Actual usable testosterone" },
    { name: "Estradiol (E2)", priority: "HIGH", reason: "Rule out aromatization / estrogen dominance" },
    { name: "Liver Function Test (LFT)", priority: "HIGH", reason: "Rule out liver strain, check ALT/AST" },
    { name: "Kidney Function (Creatinine & GFR)", priority: "HIGH", reason: "Dark urine, pre-supplementation baseline" },
    { name: "Vitamin D3", priority: "MED", reason: "Essential for testosterone & immunity" },
    { name: "Lipid Panel", priority: "MED", reason: "Check cholesterol levels for heart health" },
  ],
  bloodPressure: {
    history: [], // Elements format: { date: "YYYY-MM-DD", sys: 120, dia: 80 }
    status: "Never Measured - High Risk"
  },
  consultations: [
    { type: "Dermatologist", issue: "Moles, hormonal acne, receding hairline", status: "Pending Booking" },
    { type: "General Physician", issue: "Asthma management for exercise", status: "Pending Booking" },
  ]
};

// ═══════════════════════════════════════════════════════════════════
// MENTAL HEALTH & HABITS DATA
// ═══════════════════════════════════════════════════════════════════
export const MENTAL_DATA = {
  brainFog: {
    status: "Severe",
    rootCauses: ["Sleep Deprivation (5-6 hrs)", "High Stress/Cortisol", "Possible dehydration"],
    fixes: ["Strict 8-hour sleep window", "3L water daily", "Box breathing 5 mins/day"]
  },
  dailyHabits: [
    { habit: "Box Breathing (4-4-4-4)", time: "5 mins", period: "Morning", benefit: "Reduces cortisol immediately" },
    { habit: "Sunlight Exposure", time: "10 mins", period: "Morning", benefit: "Sets circadian rhythm for better sleep" },
    { habit: "No screens before bed", time: "1 hour", period: "Night", benefit: "Allows melatonin production" },
    { habit: "Read a physical book", time: "15 mins", period: "Night", benefit: "Reduces screen-induced headaches" }
  ],
  skillsGoals: [
    { skill: "Stress Management", target: "Calmer baseline, fewer mood swings", timeline: "30 Days" },
    { skill: "Focus / Deep Work", target: "No brain fog, 2+ hours deep work", timeline: "60 Days" }
  ]
};
