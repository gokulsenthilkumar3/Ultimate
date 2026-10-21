// Quick Capture turns one plain sentence into a single reviewed record, so the
// common daily entries never need a form: "spent 450 on lunch via upi",
// "drank 500ml", "slept 7h 30m", "weight 72.4", "mood good", "todo call bank
// tomorrow". The parser is pure and conservative: anything ambiguous returns
// null and the palette falls back to ordinary search.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const CATEGORY_WORDS = {
  Food: ['lunch', 'dinner', 'breakfast', 'brunch', 'snack', 'snacks', 'coffee', 'tea', 'chai', 'swiggy', 'zomato', 'restaurant', 'food', 'pizza', 'burger', 'biryani',
    'grocery', 'groceries', 'blinkit', 'zepto', 'bigbasket', 'instamart', 'vegetables', 'fruits', 'milk', 'dmart'],
  Transport: ['uber', 'ola', 'rapido', 'cab', 'taxi', 'auto', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'flight', 'fastag'],
  Utilities: ['electricity', 'bill', 'wifi', 'internet', 'broadband', 'recharge', 'mobile', 'phone', 'gas', 'dth', 'water bill'],
  Rent: ['rent', 'emi'],
  Gym: ['gym', 'membership', 'yoga', 'cult'],
  Supplements: ['protein', 'whey', 'creatine', 'supplement', 'supplements', 'vitamins', 'multivitamin'],
  Medical: ['medicine', 'medicines', 'pharmacy', 'doctor', 'hospital', 'clinic', 'lab', 'dentist', 'checkup'],
  Entertainment: ['movie', 'movies', 'netflix', 'spotify', 'prime', 'hotstar', 'concert', 'game', 'games', 'outing', 'party'],
  Apparel: ['clothes', 'shirt', 'tshirt', 'shoes', 'jeans', 'myntra', 'ajio', 'apparel', 'jacket'],
  Learning: ['course', 'book', 'books', 'udemy', 'coursera', 'class', 'tuition', 'kindle'],
  Equipment: ['dumbbell', 'dumbbells', 'equipment', 'gear', 'mat'],
  Salary: ['salary', 'payroll', 'paycheck', 'stipend'],
};
const METHODS = { upi: 'UPI', gpay: 'UPI', phonepe: 'UPI', paytm: 'UPI', bhim: 'UPI', card: 'Card', credit: 'Card', debit: 'Card', cash: 'Cash', netbanking: 'Bank transfer', neft: 'Bank transfer', imps: 'Bank transfer' };
const MOODS = { excellent: 5, great: 5, amazing: 5, awesome: 5, good: 4, fine: 4, happy: 4, okay: 3, ok: 3, neutral: 3, meh: 3, low: 2, sad: 2, tired: 2, stressed: 2, bad: 1, rough: 1, awful: 1, terrible: 1 };
const MOOD_LABELS = { 5: 'Excellent', 4: 'Good', 3: 'Neutral', 2: 'Low', 1: 'Rough' };
const VOLUME_ML = { ml: 1, l: 1000, litre: 1000, litres: 1000, liter: 1000, liters: 1000, glass: 250, glasses: 250, cup: 250, cups: 250, bottle: 500, bottles: 500 };

const pad = value => String(value).padStart(2, '0');
export const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shift = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };

/** Remove a date word from the text and resolve it. Past entries resolve a
    weekday backwards ("lunch monday" = last Monday); tasks resolve forwards. */
export function extractDate(text, now = new Date(), direction = 'past') {
  const patterns = [
    [/\b(?:on\s+)?yesterday\b/, () => shift(now, -1)],
    [/\b(?:on\s+)?(?:today|tonight|this evening|this morning)\b/, () => now],
    [/\b(?:on\s+)?tomorrow\b/, () => shift(now, 1)],
    [/\bnext week\b/, () => shift(now, 7)],
    [new RegExp(`\\b(?:on\\s+|last\\s+|next\\s+)?(${WEEKDAYS.join('|')})\\b`), match => {
      const target = WEEKDAYS.indexOf(match[1]);
      const today = now.getDay();
      if (direction === 'future' || /^next\s/.test(match[0])) return shift(now, ((target - today + 7) % 7) || 7);
      return shift(now, -(((today - target) + 7) % 7));
    }],
  ];
  for (const [pattern, resolve] of patterns) {
    const match = text.match(pattern);
    if (match) return { date: dateKey(resolve(match)), rest: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim(), explicit: true };
  }
  return { date: dateKey(now), rest: text, explicit: false };
}

/** Parse "450", "1,250.50", "1.5k", "₹450", "rs 450", "$12". */
export function extractAmount(text) {
  const match = text.match(/(?<![\w.])(?:₹|rs\.?\s*|inr\s*|\$|usd\s*)?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?\s*(k|thousand|lakh|lac)?(?:\s*(?:rs|rupees|inr|bucks))?(?![\w.])/i);
  if (!match) return null;
  let amount = Number(`${match[1].replace(/,/g, '')}${match[2] ? `.${match[2]}` : ''}`);
  const scale = (match[3] || '').toLowerCase();
  if (['k', 'thousand'].includes(scale)) amount *= 1000;
  if (['l', 'lakh', 'lac'].includes(scale)) amount *= 100000;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) return null;
  return { amount: Math.round(amount * 100) / 100, rest: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim() };
}

export function inferCategory(text, fallback = 'Other') {
  const words = ` ${text.toLowerCase()} `;
  for (const [category, keywords] of Object.entries(CATEGORY_WORDS)) {
    if (keywords.some(word => words.includes(` ${word} `))) return category;
  }
  return fallback;
}

function extractMethod(text) {
  const match = text.match(/\b(?:via|by|using|with|through|paid by)?\s*(upi|gpay|phonepe|paytm|bhim|card|credit card|debit card|credit|debit|cash|netbanking|neft|imps)\b/i);
  if (!match) return { method: null, rest: text };
  return { method: METHODS[match[1].toLowerCase().split(' ')[0]], rest: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim() };
}

const sentence = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
const cleanDescription = value => value.replace(/^(?:on|for|at|to|from|in)\s+/i, '').replace(/\s+(?:on|for|at|to|from)$/i, '').trim();

function money(text, now, type) {
  const amount = extractAmount(text);
  if (!amount) return null;
  const dated = extractDate(amount.rest, now, 'past');
  const paid = extractMethod(dated.rest);
  const description = cleanDescription(paid.rest);
  const category = type === 'Income' ? inferCategory(description, 'Salary') : inferCategory(description);
  const note = sentence(description) || (type === 'Income' ? 'Income' : 'Expense');
  return {
    kind: type === 'Income' ? 'income' : 'expense', target: 'transaction',
    payload: { amount: amount.amount, type, category, ...(paid.method ? { method: paid.method } : {}), date: dated.date, note },
    title: `${type === 'Income' ? 'Add income' : 'Add expense'} · ${amount.amount.toLocaleString('en-IN')}`,
    detail: [category, paid.method, note !== category ? note : null, dated.explicit ? dated.date : 'today'].filter(Boolean).join(' · '),
  };
}

export function parseQuickCapture(input, { now = new Date() } = {}) {
  const text = String(input || '').trim().replace(/\s+/g, ' ').replace(/\.+$/, '');
  if (text.length < 4 || text.length > 240) return null;
  const lower = text.toLowerCase();
  let match;

  if ((match = lower.match(/^(?:spent|spend|paid|pay|bought|buy|expense|-)\s+(.+)$/))) return money(match[1], now, 'Expense');
  if ((match = lower.match(/^(?:earned|received|got paid|income|\+)\s+(.+)$/))) return money(match[1], now, 'Income');
  if ((match = lower.match(/^salary\s+(.+)$/))) return money(`${match[1]} salary`, now, 'Income');

  if ((match = lower.match(/^(?:drank|drink|had|water)\s+(\d+(?:\.\d+)?)\s*(ml|l|litres?|liters?|glass(?:es)?|cups?|bottles?)?(?:\s+(?:of\s+)?water)?$/))) {
    if (!match[2] && !/water|^water/.test(lower)) return null;
    const amount = Math.round(Number(match[1]) * VOLUME_ML[match[2] || 'ml']);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) return null;
    return { kind: 'hydration', target: 'hydration', payload: { amount }, title: `Log water · ${amount} ml`, detail: match[2] && VOLUME_ML[match[2]] !== 1 ? `${match[1]} ${match[2]} counted as ${amount} ml` : 'Hydration · now' };
  }

  if ((match = lower.match(/^slept\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s*(?:(\d{1,2})\s*(?:m|min|mins|minutes?))?(.*)$/))) {
    const hours = Math.round((Number(match[1]) + Number(match[2] || 0) / 60) * 100) / 100;
    if (!(hours >= 0.5 && hours <= 16)) return null;
    const dated = extractDate(match[3] || '', now, 'past');
    return { kind: 'sleep', target: 'sleep', payload: { date: dated.date, duration: hours, hours, notes: 'Quick capture' }, title: `Log sleep · ${hours} h`, detail: `Night ending ${dated.explicit ? dated.date : 'today'}` };
  }

  if ((match = lower.match(/^(?:weight|weigh|weighed|i weigh)\s+(\d{2,3}(?:\.\d{1,2})?)\s*(kg|kgs|lb|lbs|pounds?)?(.*)$/))) {
    const pounds = /^(?:lb|lbs|pound)/.test(match[2] || '');
    const value = Math.round((pounds ? Number(match[1]) * 0.45359237 : Number(match[1])) * 10) / 10;
    if (!(value >= 25 && value <= 350)) return null;
    const dated = extractDate(match[3] || '', now, 'past');
    return { kind: 'weight', target: 'metric', payload: { metric: 'weight', value, unit: 'kg', date: dated.date, measuredAt: dated.explicit ? `${dated.date}T08:00:00` : now.toISOString(), source: 'quick-capture' },
      title: `Log weight · ${value} kg`, detail: pounds ? `${match[1]} lb converted · ${dated.date}` : `Body metric · ${dated.explicit ? dated.date : 'today'}` };
  }

  if ((match = lower.match(/^(?:mood|feeling|feel|felt|i feel|i'm feeling)\s+(?:very\s+|really\s+|pretty\s+)?([a-z]+)(.*)$/)) && MOODS[match[1]]) {
    const mood = MOODS[match[1]];
    const dated = extractDate(match[2] || '', now, 'past');
    return { kind: 'mood', target: 'mood', payload: { date: dated.date, mood, note: 'Quick capture' }, title: `Check in · ${MOOD_LABELS[mood]}`, detail: `Mood ${mood}/5 · ${dated.explicit ? dated.date : 'today'}` };
  }

  if ((match = text.match(/^(?:todo|to do|task|remind me to|remember to)\s*[:-]?\s+(.+)$/i))) {
    let body = match[1];
    let priority = 'medium';
    if (/(?:^!|\s!$|\burgent\b|\bhigh priority\b|\basap\b)/i.test(body)) { priority = 'high'; body = body.replace(/^!\s*|\s!$|\burgent\b|\bhigh priority\b|\basap\b/gi, ' '); }
    const dated = extractDate(body.toLowerCase(), now, 'future');
    // Preserve the owner's capitalisation for the title.
    const title = dated.explicit ? body.replace(new RegExp(`\\b(?:on\\s+|by\\s+|next\\s+)?(?:${['yesterday', 'today', 'tonight', 'tomorrow', 'next week', ...WEEKDAYS].join('|')})\\b`, 'i'), ' ') : body;
    const clean = sentence(title.replace(/\s+(?:by|on)$/i, '').replace(/\s+/g, ' ').trim());
    if (!clean) return null;
    return { kind: 'task', target: 'task', payload: { title: clean, status: 'pending', priority, ...(dated.explicit ? { due_date: dated.date } : {}) },
      title: `Add task · ${clean}`, detail: [priority === 'high' ? 'High priority' : null, dated.explicit ? `Due ${dated.date}` : 'No due date'].filter(Boolean).join(' · ') };
  }
  return null;
}

export const QUICK_CAPTURE_EXAMPLES = Object.freeze(['spent 450 on lunch via upi', 'drank 500ml', 'slept 7h 30m', 'weight 72.4', 'mood good', 'todo renew passport friday']);
