const profile = { email: 'alex@example.test', profile: { name: 'Alex Fixture', familySize: 2 }, budget: { rule: '50/30/20', monthly: { income: 80000, needs: 40000, wants: 24000, savings: 16000 } } };
const rows = [{ id: 'fixture-groceries', amount: 1200, type: 'expense', category: 'Food', description: 'Fixture groceries', date: '2026-10-20', createdAt: { toDate: () => new Date('2026-10-20T12:00:00Z') } }];
export const doc = (...args) => args;
export const collection = doc;
export const query = doc;
export const orderBy = doc;
export const where = doc;
export const getDoc = async () => ({ exists: () => true, data: () => profile });
export const getDocs = async () => { const docs = rows.map(row => ({ id: row.id, data: () => row })); return { docs, forEach: callback => docs.forEach(callback), empty: false }; };
export const onSnapshot = (_, callback) => { queueMicrotask(async () => callback(await getDocs())); return () => {}; };
const localWrite = async () => { throw new Error('UI fixture is read-only. No product database was contacted.'); };
export const addDoc = localWrite;
export const updateDoc = localWrite;
export const setDoc = localWrite;
export const serverTimestamp = () => new Date();
export class Timestamp {
  constructor(date) { this.date = date; }
  toDate() { return this.date; }
  static now() { return new Timestamp(new Date()); }
  static fromDate(date) { return new Timestamp(date); }
}
