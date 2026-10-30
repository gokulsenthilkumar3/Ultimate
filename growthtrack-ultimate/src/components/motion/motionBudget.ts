/** One admission queue for decorative animation tracks. Priority bursts pre-empt idle tracks. */
export class MotionBudget {
  private requests = new Map<string, { cost: number; priority: number }>();
  private granted = new Set<string>();
  private listeners = new Set<() => void>();
  private version = 0;
  active = 0;
  constructor(public limit = 6) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.version;
  has = (id: string, cost?: number) => this.granted.has(id) && (cost === undefined || this.requests.get(id)?.cost === cost);
  request(id: string, cost: number, priority = 0) { this.requests.set(id, { cost, priority }); this.reconcile(); }
  release(id: string) { if (this.requests.delete(id)) this.reconcile(); }
  setLimit(limit: number) { if (limit !== this.limit) { this.limit = limit; this.reconcile(); } }
  private reconcile() {
    this.active = 0; this.granted.clear();
    for (const [id, request] of [...this.requests].sort((a, b) => b[1].priority - a[1].priority)) {
      if (request.cost <= this.limit - this.active) { this.granted.add(id); this.active += request.cost; }
    }
    this.version++; this.listeners.forEach(listener => listener());
  }
}
