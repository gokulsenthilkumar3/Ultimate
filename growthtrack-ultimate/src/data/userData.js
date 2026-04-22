// ══════════════════════════════════════════════════════════════
// USER PROFILE — Ultimate Digital Twin Engine v2.0
// ══════════════════════════════════════════════════════════════
export const USER = {
  // ── Identity
  name:        'Gokul',
  age:         23,
  born:        'June 2003',
  height:      182,          // cm
  heightFt:    "5'11.5\"",
  weight:      63,           // kg
  bmi:         (63 / (1.82 * 1.82)).toFixed(1),
  bodyFat:     22,           // % (estimated)
  muscleMass:  49,           // kg lean mass
  skinTone:    '#C68642',    // Fitzpatrick IV warm-brown

  // ── Measurements
  legHeight:      102,
  shoulderHeight: 150,

  // ── Sleep Block (used by SleepDashboard)
  sleep: {
    avgHours:    5.5,        // hours per night (14-day avg)
    weeklyDebt:  14,         // hours of sleep debt this week
    bedtime:     '12:30am',
    wakeTime:    '6:00am',
  },

  // ── Goal Block (used by GoalsDashboard)
  goal: {
    weight:         82,      // kg target
    bodyFat:        10,      // % target
    muscleMass:     70,      // kg lean mass target
    bench:          120,     // kg bench press target
    deadline:       'Dec 2026',
    timelineMonths: 20,
  },

  // ── Performance Radar Scores (used by Analytics)
  scores: {
    strength:  42,           // 0–100
    endurance: 38,
    recovery:  55,
    nutrition: 60,
    sleep:     35,
    mobility:  48,
  },

  // ── Daily Habits (used by GoalsDashboard)
  habits: [
    'Hit protein target (170g)',
    'Resistance training completed',
    'Sleep 7h+ achieved',
    'Caloric surplus maintained',
    'Morning sunlight (10 min)',
    'Creatine 5g taken',
    'No alcohol or smoking',
    'Steps > 8000',
    'Hydration: 3L+ water',
    'No late-night eating after 10 PM',
  ],

  // ── Nutrition Block
  nutrition: {
    tdee:          2750,     // maintenance calories
    surplus:       2950,     // lean bulk target
    protein:       170,      // grams/day
    carbs:         280,
    fat:           90,
  },

  // ── Training Block
  training: {
    weeklyVolume:  18,       // working sets/week
    daysPerWeek:   5,
    currentSplit:  'Upper/Lower + Push/Pull',
    primaryFocus:  'Hypertrophy',
  },

  // ── Strength Baseline
  strength: {
    bench:   60,             // kg
    squat:   80,
    deadlift:100,
    ohp:     40,
  },

  // ── Holistic Metrics (legacy — kept for Assessment tab)
  eyePower:    -2.5,
  memoryPower: 65,
  stamina:     40,
  flexibility: 15,
  hairHealth:  50,
  skinGlow:    40,
  senses:      { sight: 60, hearing: 85, smell: 80, taste: 90, touch: 85 },

  // ── Lifestyle (legacy — kept for Lifestyle tab)
  lifestyle:      'Sedentary (desk job / little movement)',
  diet:           'Non-veg + veg mix — mostly home cooked + occasional junk',
  waterIntake:    '1–2 litres/day',
  sleepHours:     '5–6 hrs',
  caffeine:       '3+ coffees/day',
  negativeHabits: ['Excessive caffeine (3+ coffees/day)', 'Late night eating'],
  concerns:       ['High stress', 'Sleep problems', 'Asthma', 'Dust/smoke/perfume allergies'],

  // ── Health Flags
  energyLevel:   'Fatigued most of the day',
  heartRate:     'Never checked',
  bloodPressure: 'Never checked',
  bloodwork:     'Never done',
  urineColor:    'Dark/yellow often (dehydration)',
  flexLevel:     'Very stiff — cannot touch toes',
  priorities:    ['Energy & hormones', 'Internal health (organs, gut)', 'Posture & joints', 'Skin, hair & face'],
};

// ── Status Labels (used across all tabs)
export const STATUS = {
  critical:  { label: 'Critical',  color: '#ef4444', bg: '#7f1d1d' },
  warning:   { label: 'Warning',   color: '#f59e0b', bg: '#78350f' },
  moderate:  { label: 'Moderate',  color: '#f97316', bg: '#7c2d12' },
  fair:      { label: 'Fair',      color: '#eab308', bg: '#713f12' },
  good:      { label: 'Good',      color: '#22c55e', bg: '#14532d' },
  optimal:   { label: 'Optimal',   color: '#06b6d4', bg: '#164e63' },
};

// ── Tab IDs (used by App.jsx + Navigation.jsx for routing)
export const TABS = [
  { id: 'overview',   label: 'Overview'   },
  { id: 'body3d',     label: '3D Twin'    },
  { id: 'assessment', label: 'Assessment' },
  { id: 'medical',    label: 'Medical'    },
  { id: 'physique',   label: 'Physique'   },
  { id: 'training',   label: 'Training'   },
  { id: 'nutrition',  label: 'Nutrition'  },
  { id: 'lifestyle',  label: 'Lifestyle'  },
  { id: 'sleep',      label: 'Sleep'      },
  { id: 'goals',      label: 'Goals'      },
  { id: 'analytics',  label: 'Analytics'  },
  { id: 'progress',   label: 'Progress'   },
];

export const HEALTH_SCORE = 42;

// ── Body Parts Map (used by Body3D.jsx raycaster)
export const BODY_PARTS = {
  head: {
    key: 'head', name: 'Head & Brain', icon: '🧠',
    status: 'warning',
    issues: ['Sleep deprivation reducing cognitive function', 'Caffeine dependency cycle'],
    fixes:  ['Target 7–8h sleep — use 4-7-8 breathing technique', 'Taper caffeine by 1 cup/week', 'Magnesium glycinate 400mg at night'],
  },
  neck: {
    key: 'neck', name: 'Neck & Cervical', icon: '🤛',
    status: 'moderate',
    issues: ['Forward head posture from desk work', 'Weak deep neck flexors'],
    fixes:  ['Chin tucks 3x10 daily', 'Face pulls 3x20 every training day', 'Reduce screen time at eye level'],
  },
  chest: {
    key: 'chest', name: 'Chest & Lungs', icon: '🪴',
    status: 'warning',
    issues: ['Asthma diagnosis', 'Low aerobic capacity (VO2 max estimated ~30)', 'Dust/smoke/perfume triggers'],
    fixes:  ['Zone 2 cardio 2x/week (30 min brisk walk/cycle)', 'Keep salbutamol inhaler available', 'Diaphragmatic breathing drill 5 min/day'],
  },
  core: {
    key: 'core', name: 'Core & Gut', icon: '🪬',
    status: 'critical',
    issues: ['No blood work done — gut health unknown', 'High caffeine stressing gut lining', 'Irregular meal timing'],
    fixes:  ['Get CBC + lipid panel blood work done', 'Add 1 tbsp psyllium husk + probiotic daily', 'Eat first meal within 1h of waking'],
  },
  arms: {
    key: 'arms', name: 'Arms & Shoulders', icon: '💪',
    status: 'fair',
    issues: ['Underdeveloped relative to height', 'No compound pressing history'],
    fixes:  ['Prioritise OHP + close-grip bench', 'Progressive overload tracked weekly', 'Volume: 16–20 sets/week for arms'],
  },
  legs: {
    key: 'legs', name: 'Legs & Glutes', icon: '🦵',
    status: 'fair',
    issues: ['Very low flexibility (cannot touch toes)', 'Sedentary lifestyle'],
    fixes:  ['Squat + RDL 2x/week', 'Hip flexor stretch 3x45s daily', 'Ankle mobility work before squats'],
  },
  spine: {
    key: 'spine', name: 'Spine & Posture', icon: '🦴',
    status: 'moderate',
    issues: ['Anterior pelvic tilt suspected', 'Rounded upper back from desk work'],
    fixes:  ['Deadlift + Barbell row for posterior chain', 'McKenzie press-ups 2x10 daily', 'Sleep on back with pillow under knees'],
  },
  heart: {
    key: 'heart', name: 'Heart & Circulation', icon: '❤️',
    status: 'warning',
    issues: ['Heart rate and BP never checked', 'High stress + low sleep elevating resting HR'],
    fixes:  ['Check resting HR + BP — target: HR < 70 bpm, BP < 120/80', 'Omega-3 2g/day for cardiovascular support', 'Reduce caffeine to lower cortisol-driven HR spikes'],
  },
  liver: {
    key: 'liver', name: 'Liver & Metabolism', icon: '🫘',
    status: 'critical',
    issues: ['ALT/AST levels unknown', 'Dark urine suggests chronic dehydration + possible liver stress'],
    fixes:  ['Get ALT, AST, GGT blood panel done', 'Drink 3L water daily minimum', 'Milk thistle supplement 150mg/day'],
  },
  kidneys: {
    key: 'kidneys', name: 'Kidneys', icon: '🧠',
    status: 'warning',
    issues: ['Chronically dehydrated (dark urine)', 'High protein target may stress kidneys if dehydrated'],
    fixes:  ['Hit 3L+ water target consistently', 'Add electrolyte tab to morning water', 'Monitor urine colour daily — target pale yellow'],
  },
  hormones: {
    key: 'hormones', name: 'Hormonal System', icon: '🧬',
    status: 'critical',
    issues: ['High cortisol from poor sleep + caffeine + stress', 'Testosterone likely suboptimal (low sleep + low BF% intake)'],
    fixes:  ['Test Total T, Free T, SHBG, cortisol panel', 'Zinc 30mg + Vit D3 5000 IU + Magnesium daily', 'Fix sleep first — 80% of testosterone is produced during deep sleep'],
  },
  immune: {
    key: 'immune', name: 'Immune System', icon: '🛡️',
    status: 'moderate',
    issues: ['Asthma + multiple allergies indicate immune dysregulation', 'Low Vit D suspected'],
    fixes:  ['Vit D3 5000 IU/day + K2 100mcg', 'Quercetin 500mg for allergy management', 'Eliminate processed food 30-day trial'],
  },

  // ── Body Metrics (used by HumanoidViewer)
  metrics: {
    height: 182,      // cm
    weight: 63,       // kg
    chest: 95,        // cm
    waist: 80,        // cm  
    shoulders: 110,   // cm
    arms: 35,         // cm (bicep circumference)
    thighs: 55,       // cm
    neck: 38,         // cm
    calves: 37,       // cm
    hips: 95,         // cm
  },
};
