/**
 * Personalized Physique Analysis & Target Goals
 * 
 * Complete assessment of current measurements vs ideal targets
 * Includes transformation roadmap and training/nutrition guidance
 */

export const PHYSIQUE_ANALYSIS = {
  // User Profile
  profile: {
    age: 23,
    gender: 'male',
    heightCm: 182,
    heightFeet: "6'0\"",
    currentWeightKg: 63,
    currentWeightLbs: 139,
    targetWeightKg: { min: 75, max: 78 },
    targetWeightLbs: { min: 165, max: 172 },
    weightGainNeeded: '12-15 kg lean muscle mass',
  },

  // Body Measurements with Targets
  measurements: [
    {
      bodyPart: 'Height',
      currentCm: 182,
      currentInches: '6\'0"',
      idealTargetCm: null,
      idealTargetInches: null,
      analysis: 'You have a fantastic height for an aesthetic physique.',
      priority: null,
      gainNeeded: null,
    },
    {
      bodyPart: 'Weight',
      currentCm: '63 kg',
      currentInches: '139 lbs',
      idealTargetCm: '75-78 kg',
      idealTargetInches: '165-172 lbs',
      analysis: 'You need to gain ~12-15 kg of lean muscle mass.',
      priority: 'Critical',
      gainNeeded: '12-15 kg',
    },
    {
      bodyPart: 'Shoulders',
      currentCm: 107.5,
      currentInches: 42.3,
      idealTargetCm: { min: 122, max: 124 },
      idealTargetInches: { min: 48, max: 49 },
      analysis: 'Priority #1. This is the key to the V-taper.',
      priority: 1,
      gainNeeded: '14.5-16.5 cm',
    },
    {
      bodyPart: 'Chest',
      currentCm: 86.5,
      currentInches: 34.1,
      idealTargetCm: { min: 102, max: 107 },
      idealTargetInches: { min: 40, max: 42 },
      analysis: 'Priority #2. A bigger chest fills out your frame.',
      priority: 2,
      gainNeeded: '15.5-20.5 cm',
    },
    {
      bodyPart: 'Waist',
      currentCm: 82,
      currentInches: 32.3,
      idealTargetCm: { min: 74, max: 76 },
      idealTargetInches: { min: 29, max: 30 },
      analysis: 'Crucial. You won\'t need to lose weight, just recompose. As you build muscle elsewhere, your waist will appear smaller and tighter.',
      priority: 'Maintain/Recompose',
      gainNeeded: 'Maintain or reduce 6-8 cm',
    },
    {
      bodyPart: 'Arms',
      currentCm: 30,
      currentInches: 11.8,
      idealTargetCm: { min: 40, max: 41 },
      idealTargetInches: { min: 15.7, max: 16.1 },
      analysis: 'Major Focus. A 10 cm gain will make a huge difference.',
      priority: 'Major Focus',
      gainNeeded: '10-11 cm',
    },
    {
      bodyPart: 'Forearms',
      currentCm: 27,
      currentInches: 10.6,
      idealTargetCm: { min: 33, max: 34 },
      idealTargetInches: { min: 13, max: 13.4 },
      analysis: 'Needs development to balance with the upper arm.',
      priority: 'Balance',
      gainNeeded: '6-7 cm',
    },
    {
      bodyPart: 'Thighs',
      currentCm: 53,
      currentInches: 20.9,
      idealTargetCm: { min: 58, max: 60 },
      idealTargetInches: { min: 22.8, max: 23.6 },
      analysis: 'Need solid growth for a powerful, balanced look.',
      priority: 'Growth',
      gainNeeded: '5-7 cm',
    },
    {
      bodyPart: 'Calves',
      currentCm: 35,
      currentInches: 13.8,
      idealTargetCm: { min: 39, max: 41 },
      idealTargetInches: { min: 15.4, max: 16.1 },
      analysis: 'Need development to match arm size.',
      priority: 'Development',
      gainNeeded: '4-6 cm',
    },
  ],

  // Key Metrics
  keyMetrics: {
    shoulderToWaistRatio: {
      current: 1.31,
      target: '1.6+',
      status: 'Below Target',
      importance: 'The Ultimate Goal. This number is your key metric.',
    },
  },

  // Transformation Roadmap
  roadmap: {
    primaryMission: 'Lean Bulk',
    timeline: '12-18 months',
    approach: 'Build muscle mass systematically across entire body, with special emphasis on upper back, shoulders, and chest to create the taper.',
  },

  // Nutrition Plan
  nutrition: {
    calorieSurplus: {
      dailySurplus: '300-500 calories',
      expectedWeightGain: '0.25-0.5 kg (0.5-1 lb) per week',
    },
    protein: {
      gramsPerKg: '1.8-2.2 g',
      dailyGoal: '115-140 grams',
      sources: [
        'Chicken breast',
        'Lean beef',
        'Fish',
        'Eggs',
        'Milk',
        'Greek yogurt',
        'Protein powder',
        'Lentils',
        'Tofu',
      ],
    },
    carbs: {
      importance: 'Fuel intense workouts',
      sources: ['Rice', 'Potatoes', 'Oats', 'Bread'],
    },
    fats: {
      importance: 'Support hormone production',
      sources: ['Avocado', 'Nuts', 'Olive oil'],
    },
  },

  // Training Plan
  training: {
    principle: 'Progressive Overload',
    description: 'Consistently adding weight or reps over time',

    priorityExercises: {
      shoulders: {
        priority: 1,
        goal: 'WIDER SHOULDERS',
        exercises: [
          {
            name: 'Barbell/Dumbbell Overhead Press',
            importance: '#1 mass builder',
          },
          {
            name: 'Dumbbell Lateral Raises',
            importance: 'Absolutely critical for width',
            frequency: '2-3 times a week',
            reps: '12-15',
          },
          {
            name: 'Face Pulls',
            importance: 'For rear delt development and shoulder health',
            frequency: 'Every upper body day',
          },
        ],
      },
      backAndChest: {
        priority: 2,
        goal: 'BROADER BACK & CHEST (The V-Taper)',
        exercises: [
          {
            name: 'Pull-Ups & Lat Pulldowns',
            importance: 'Essential for back width',
            note: 'If you can\'t do pull-ups, use assistance',
          },
          {
            name: 'Bent-Over Rows',
            importance: 'Thickness for your back',
          },
          {
            name: 'Bench Press & Incline Bench Press',
            importance: 'For a full, developed chest',
          },
        ],
      },
      arms: {
        priority: 'Major Focus',
        goal: 'BIGGER ARMS',
        exercises: [
          {
            name: 'Close-Grip Bench Press & Tricep Pushdowns',
            importance: 'Triceps are 2/3 of your arm mass',
          },
          {
            name: 'Barbell Curls & Hammer Curls',
            importance: 'For bicep peaks',
          },
        ],
      },
      lowerBody: {
        importance: 'Non-negotiable',
        goal: 'Foundation & Hormonal Benefits',
        exercises: [
          {
            name: 'Squats & Deadlifts',
            importance: 'Release growth hormones that help entire body grow',
          },
        ],
      },
    },

    recommendedSplit: {
      name: 'Push/Pull/Legs (PPL)',
      description: 'Highly effective for building mass',
      schedule: {
        pushDay: {
          focus: 'Chest, Shoulders, Triceps',
        },
        pullDay: {
          focus: 'Back, Rear Delts, Biceps',
        },
        legsDay: {
          focus: 'Quads, Hamstrings, Calves, Abs',
        },
      },
      frequency: '3-6 days a week',
      exampleSchedule: 'PPL, Rest, PPL, Rest',
    },
  },

  // Recovery & Lifestyle
  recovery: {
    sleep: {
      hours: '7-9 hours',
      importance: 'This is when your body repairs muscle. As important as your workout.',
    },
    stress: {
      importance: 'Manage Stress',
      reason: 'High cortisol can hinder muscle growth',
    },
    consistency: {
      importance: 'Critical',
      advantage: 'You are 23 years old. Your testosterone levels are in your prime.',
      expectedResults: 'If you follow this plan consistently for 12-18 months, you will achieve a dramatic transformation that will get you very close to your goal.',
    },
  },
};

export default PHYSIQUE_ANALYSIS;
