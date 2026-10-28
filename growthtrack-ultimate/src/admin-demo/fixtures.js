// Fictional UI samples only. These records are never fetched from a real product.
export const CUSTOMERS = [
  { id: 'FS-1048', name: 'Aarav Mehta', email: 'aarav@example.test', product: 'FinSync', plan: 'Plus', status: 'Active', joined: '24 Oct 2026', activity: '12 min ago', color: 'sage', initials: 'AM', issue: 'No open requests' },
  { id: 'OX-2081', name: 'Maya Raman', email: 'maya@example.test', product: 'OxFin', plan: 'Premium', status: 'Review', joined: '24 Oct 2026', activity: '28 min ago', color: 'peach', initials: 'MR', issue: 'Account verification review' },
  { id: 'FS-1047', name: 'Rohan Shah', email: 'rohan@example.test', product: 'FinSync', plan: 'Starter', status: 'Active', joined: '23 Oct 2026', activity: '1 hour ago', color: 'lilac', initials: 'RS', issue: 'No open requests' },
  { id: 'OX-2080', name: 'Isha Nair', email: 'isha@example.test', product: 'OxFin', plan: 'Premium', status: 'Active', joined: '23 Oct 2026', activity: '2 hours ago', color: 'blue', initials: 'IN', issue: 'No open requests' },
  { id: 'FS-1046', name: 'Kabir Rao', email: 'kabir@example.test', product: 'FinSync', plan: 'Plus', status: 'Review', joined: '22 Oct 2026', activity: '3 hours ago', color: 'sand', initials: 'KR', issue: 'Bank connection assistance' },
  { id: 'OX-2079', name: 'Leela Das', email: 'leela@example.test', product: 'OxFin', plan: 'Starter', status: 'Invited', joined: '22 Oct 2026', activity: 'Yesterday', color: 'sage', initials: 'LD', issue: 'Invitation pending' },
  { id: 'FS-1045', name: 'Arjun Sen', email: 'arjun@example.test', product: 'FinSync', plan: 'Plus', status: 'Active', joined: '21 Oct 2026', activity: 'Yesterday', color: 'blue', initials: 'AS', issue: 'No open requests' },
  { id: 'OX-2078', name: 'Tara Kapoor', email: 'tara@example.test', product: 'OxFin', plan: 'Premium', status: 'Inactive', joined: '20 Oct 2026', activity: '4 days ago', color: 'lilac', initials: 'TK', issue: 'No open requests' },
];
export const ACTIVITY = [
  { title: 'New FinSync customer', text: 'Aarav Mehta joined the Plus plan', time: '12 min', type: 'customer' },
  { title: 'Account ready for review', text: 'Maya Raman · OxFin', time: '28 min', type: 'review' },
  { title: 'Family event added', text: 'Sunday lunch · Family Connect', time: '46 min', type: 'family' },
  { title: 'Weekly goal completed', text: 'Four training sessions · GrowthTrack', time: '1 hr', type: 'growth' },
];
export const STOCKS = [
  ['RELIANCE', 'Reliance Industries', '2,784.50', '+1.24%', '₹ 83,535', 'Energy'],
  ['TCS', 'Tata Consultancy Services', '4,126.80', '+0.86%', '₹ 61,902', 'Technology'],
  ['HDFCBANK', 'HDFC Bank', '1,724.25', '−0.42%', '₹ 86,213', 'Banking'],
  ['INFY', 'Infosys', '1,896.10', '+1.12%', '₹ 56,883', 'Technology'],
  ['ITC', 'ITC Limited', '487.60', '+0.64%', '₹ 48,760', 'Consumer goods'],
];
export const TASKS = [
  { title: 'Review OxFin support requests', context: 'Customer operations', date: 'Today', status: 'In progress', priority: 'High' },
  { title: 'Prepare the weekly growth review', context: 'GrowthTrack', date: 'Today', status: 'To do', priority: 'Medium' },
  { title: 'Organise family documents', context: 'Family Connect', date: 'Tomorrow', status: 'To do', priority: 'Low' },
  { title: 'Review equity watchlist', context: 'Markets', date: 'Tomorrow', status: 'Done', priority: 'Medium' },
];
export const FILES = [
  ['Quarterly review.pdf', 'PDF document', 'Workspace', '1.2 MB', 'Today'],
  ['Family memories', 'Collection · 24 items', 'Family Connect', '48 MB', 'Yesterday'],
  ['Family certificates.pdf', 'PDF document', 'Family Connect', '820 KB', '26 Oct'],
  ['Family contacts.md', 'Markdown document', 'Family Connect', '8 KB', '24 Oct'],
  ['Training programme.pdf', 'PDF document', 'GrowthTrack', '840 KB', '26 Oct'],
  ['Investment notes.md', 'Markdown document', 'Equity', '12 KB', '25 Oct'],
];
