import {
  ServiceCategory,
  ServiceCategoryId,
  Token,
  Counter,
  QueueState,
  QueueAnalytics,
  WaitEstimate,
} from '../types/queue.js';
import {
  calculateEWMA,
  calculateAggregateWaitSec,
  calculateErlangC,
  DEFAULT_MU,
  DEFAULT_SERVICE_DURATION_SEC,
} from './calculator.js';

export const SERVICE_CATEGORIES: Record<ServiceCategoryId, ServiceCategory> = {
  GEN: {
    id: 'GEN',
    prefix: 'GEN',
    name: 'General Inquiries',
    description: 'Civic information, form submission & general intake',
    baseDurationSec: 90,
    color: 'blue',
    iconName: 'HelpCircle',
  },
  DOC: {
    id: 'DOC',
    prefix: 'DOC',
    name: 'Document Attestation',
    description: 'Certifications, notary verifications & official apostilles',
    baseDurationSec: 150,
    color: 'indigo',
    iconName: 'FileCheck',
  },
  CSH: {
    id: 'CSH',
    prefix: 'CSH',
    name: 'Cashier & Payments',
    description: 'Municipal fee payments, utility bills & receipts',
    baseDurationSec: 75,
    color: 'emerald',
    iconName: 'CreditCard',
  },
  LIC: {
    id: 'LIC',
    prefix: 'LIC',
    name: 'Permits & Licensing',
    description: 'Business permits, building registrations & trade licenses',
    baseDurationSec: 180,
    color: 'amber',
    iconName: 'Award',
  },
  PRI: {
    id: 'PRI',
    prefix: 'PRI',
    name: 'Priority & Accessibility',
    description: 'Senior citizens, persons with disabilities & urgent civic cases',
    baseDurationSec: 100,
    color: 'purple',
    iconName: 'HeartHandshake',
  },
};

export class QueueStore {
  private waitingQueue: Token[] = [];
  private counters: Counter[] = [];
  private completedTokens: Token[] = [];
  private sequenceCounters: Record<ServiceCategoryId, number> = {
    GEN: 101,
    DOC: 201,
    CSH: 301,
    LIC: 401,
    PRI: 501,
  };
  private recentlyCalled: {
    token: Token;
    counterId: number;
    counterName: string;
    calledAt: number;
  }[] = [];
  private arrivalHistory: number[] = []; // Timestamps of arrivals in last hour
  private listeners: (() => void)[] = [];

  constructor() {
    this.initCounters();
    this.seedInitialDemoData();
  }

  private initCounters() {
    this.counters = [
      {
        id: 1,
        name: 'Counter 1',
        categorySpecialty: 'GEN',
        status: 'OPEN',
        currentServingToken: null,
        serviceStartedAt: null,
        completedCount: 14,
        totalServiceDurationSec: 14 * 85,
        mu: 1 / 85, // ~85s per customer
        avgServiceDurationSec: 85,
        history: [],
      },
      {
        id: 2,
        name: 'Counter 2',
        categorySpecialty: 'DOC',
        status: 'OPEN',
        currentServingToken: null,
        serviceStartedAt: null,
        completedCount: 10,
        totalServiceDurationSec: 10 * 140,
        mu: 1 / 140, // ~140s per customer
        avgServiceDurationSec: 140,
        history: [],
      },
      {
        id: 3,
        name: 'Counter 3',
        categorySpecialty: 'CSH',
        status: 'OPEN',
        currentServingToken: null,
        serviceStartedAt: null,
        completedCount: 19,
        totalServiceDurationSec: 19 * 65,
        mu: 1 / 65, // ~65s per customer
        avgServiceDurationSec: 65,
        history: [],
      },
      {
        id: 4,
        name: 'Counter 4',
        categorySpecialty: 'ALL',
        status: 'OPEN',
        currentServingToken: null,
        serviceStartedAt: null,
        completedCount: 8,
        totalServiceDurationSec: 8 * 110,
        mu: 1 / 110,
        avgServiceDurationSec: 110,
        history: [],
      },
    ];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('QueueStore listener error:', err);
      }
    }
  }

  /**
   * Seed demo data so that first-time users immediately see a realistic,
   * live operational queue with serving counters and waiting citizens.
   */
  public seedInitialDemoData() {
    const now = Date.now();

    // Past completed items
    const sampleCompleted: { tokenNum: string; cat: ServiceCategoryId; name: string; dur: number }[] = [
      { tokenNum: 'GEN-098', cat: 'GEN', name: 'Eleanor Vance', dur: 80 },
      { tokenNum: 'DOC-198', cat: 'DOC', name: 'Marcus Chen', dur: 135 },
      { tokenNum: 'CSH-298', cat: 'CSH', name: 'Fatima Al-Sayed', dur: 60 },
      { tokenNum: 'LIC-398', cat: 'LIC', name: 'Robert Hansen', dur: 170 },
      { tokenNum: 'GEN-099', cat: 'GEN', name: 'Devon Miles', dur: 95 },
      { tokenNum: 'DOC-199', cat: 'DOC', name: 'Aaliyah Patel', dur: 145 },
      { tokenNum: 'CSH-299', cat: 'CSH', name: 'Carlos Mendez', dur: 70 },
      { tokenNum: 'PRI-499', cat: 'PRI', name: 'Ruth Zimmerman', dur: 90 },
      { tokenNum: 'GEN-100', cat: 'GEN', name: 'Liam Walker', dur: 85 },
      { tokenNum: 'DOC-200', cat: 'DOC', name: 'Sofia Rossi', dur: 130 },
      { tokenNum: 'CSH-300', cat: 'CSH', name: 'Tariq Hassan', dur: 62 },
    ];

    this.completedTokens = sampleCompleted.map((c, i) => ({
      id: `seed-comp-${i}`,
      tokenNumber: c.tokenNum,
      serviceType: c.cat,
      citizenName: c.name,
      status: 'COMPLETED',
      createdAt: now - (sampleCompleted.length - i) * 180000,
      calledAt: now - (sampleCompleted.length - i) * 120000,
      completedAt: now - (sampleCompleted.length - i) * 60000,
      servingCounterId: (i % 4) + 1,
      servingCounterName: `Counter ${(i % 4) + 1}`,
    }));

    // Assign active serving tokens to counters 1, 2, and 3
    const serving1: Token = {
      id: 'srv-1',
      tokenNumber: 'GEN-101',
      serviceType: 'GEN',
      citizenName: 'David Kim',
      status: 'SERVING',
      createdAt: now - 320000,
      calledAt: now - 65000,
      servingCounterId: 1,
      servingCounterName: 'Counter 1',
    };
    this.counters[0].currentServingToken = serving1;
    this.counters[0].serviceStartedAt = now - 65000;

    const serving2: Token = {
      id: 'srv-2',
      tokenNumber: 'DOC-201',
      serviceType: 'DOC',
      citizenName: 'Priya Sharma',
      status: 'SERVING',
      createdAt: now - 410000,
      calledAt: now - 110000,
      servingCounterId: 2,
      servingCounterName: 'Counter 2',
    };
    this.counters[1].currentServingToken = serving2;
    this.counters[1].serviceStartedAt = now - 110000;

    const serving3: Token = {
      id: 'srv-3',
      tokenNumber: 'CSH-301',
      serviceType: 'CSH',
      citizenName: 'Michael Brown',
      status: 'SERVING',
      createdAt: now - 180000,
      calledAt: now - 45000,
      servingCounterId: 3,
      servingCounterName: 'Counter 3',
    };
    this.counters[2].currentServingToken = serving3;
    this.counters[2].serviceStartedAt = now - 45000;

    // Sequence start numbers
    this.sequenceCounters.GEN = 102;
    this.sequenceCounters.DOC = 202;
    this.sequenceCounters.CSH = 302;
    this.sequenceCounters.LIC = 401;
    this.sequenceCounters.PRI = 501;

    // Waiting queue
    this.waitingQueue = [
      {
        id: 'wait-1',
        tokenNumber: 'PRI-501',
        serviceType: 'PRI',
        citizenName: 'Martha Jenkins',
        status: 'APPROACHING',
        createdAt: now - 220000,
        isPriority: true,
      },
      {
        id: 'wait-2',
        tokenNumber: 'DOC-202',
        serviceType: 'DOC',
        citizenName: 'Lucas Oliveira',
        status: 'APPROACHING',
        createdAt: now - 190000,
      },
      {
        id: 'wait-3',
        tokenNumber: 'GEN-102',
        serviceType: 'GEN',
        citizenName: 'Sarah Jenkins',
        status: 'WAITING',
        createdAt: now - 140000,
      },
      {
        id: 'wait-4',
        tokenNumber: 'CSH-302',
        serviceType: 'CSH',
        citizenName: 'Ahmed Mansoor',
        status: 'WAITING',
        createdAt: now - 110000,
      },
      {
        id: 'wait-5',
        tokenNumber: 'LIC-401',
        serviceType: 'LIC',
        citizenName: 'Emily Watson',
        status: 'WAITING',
        createdAt: now - 80000,
      },
    ];

    // Recently called history for display
    this.recentlyCalled = [
      { token: serving3, counterId: 3, counterName: 'Counter 3', calledAt: now - 45000 },
      { token: serving1, counterId: 1, counterName: 'Counter 1', calledAt: now - 65000 },
      { token: serving2, counterId: 2, counterName: 'Counter 2', calledAt: now - 110000 },
    ];
  }

  public resetDemoData() {
    this.waitingQueue = [];
    this.completedTokens = [];
    this.recentlyCalled = [];
    this.initCounters();
    this.seedInitialDemoData();
    this.notify();
  }

  /**
   * Issues a new sequential token
   */
  public issueToken(
    serviceType: ServiceCategoryId,
    citizenName?: string,
    isPriority: boolean = false,
    extraData?: {
      userId?: string;
      cnic?: string;
      phone?: string;
      email?: string;
    }
  ): { token: Token; estimate: WaitEstimate } {
    const category = SERVICE_CATEGORIES[serviceType] || SERVICE_CATEGORIES.GEN;
    const seq = this.sequenceCounters[serviceType]++;
    const tokenNumber = `${category.prefix}-${seq}`;
    const now = Date.now();

    // Mask CNIC for public protection
    let citizenCnicMasked: string | undefined = undefined;
    if (extraData?.cnic) {
      const clean = extraData.cnic.replace(/[\s-]/g, '');
      if (clean.length === 13) {
        citizenCnicMasked = `${clean.substring(0, 5)}-*******-${clean.substring(12, 13)}`;
      } else {
        citizenCnicMasked = '•••••-•••••••-•';
      }
    }

    const token: Token = {
      id: `tok-${now}-${Math.random().toString(36).substring(2, 7)}`,
      tokenNumber,
      serviceType,
      citizenName: citizenName?.trim() || undefined,
      status: 'WAITING',
      createdAt: now,
      isPriority: isPriority || serviceType === 'PRI',
      userId: extraData?.userId,
      citizenCnicMasked,
      citizenPhone: extraData?.phone,
      citizenEmail: extraData?.email,
    };

    this.arrivalHistory.push(now);

    // If marked priority, insert ahead of standard waiting tokens
    if (token.isPriority) {
      const firstNonPriorityIdx = this.waitingQueue.findIndex((t) => !t.isPriority);
      if (firstNonPriorityIdx === -1) {
        this.waitingQueue.push(token);
      } else {
        this.waitingQueue.splice(firstNonPriorityIdx, 0, token);
      }
    } else {
      this.waitingQueue.push(token);
    }

    this.refreshApproachingStatuses();

    const position = this.getTokenPosition(token.tokenNumber);
    const estimate = this.calculateEstimateForPosition(position);

    this.notify();
    return { token, estimate };
  }

  /**
   * Get all active and completed tokens for a registered user
   */
  public getUserTickets(userId: string): {
    activeTickets: Token[];
    completedTickets: Token[];
  } {
    const activeWaiting = this.waitingQueue.filter((t) => t.userId === userId);
    const activeServing: Token[] = [];
    for (const c of this.counters) {
      if (c.currentServingToken && c.currentServingToken.userId === userId) {
        activeServing.push(c.currentServingToken);
      }
    }

    const completed = this.completedTokens.filter((t) => t.userId === userId);

    return {
      activeTickets: [...activeServing, ...activeWaiting],
      completedTickets: completed,
    };
  }

  private refreshApproachingStatuses() {
    for (let i = 0; i < this.waitingQueue.length; i++) {
      if (this.waitingQueue[i].status !== 'SERVING') {
        // When position <= 2, mark as APPROACHING
        this.waitingQueue[i].status = i < 2 ? 'APPROACHING' : 'WAITING';
      }
    }
  }

  public getTokenPosition(tokenNumber: string): number {
    const idx = this.waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber);
    return idx >= 0 ? idx + 1 : 0;
  }

  public calculateEstimateForPosition(position: number): WaitEstimate {
    const activeMus = this.counters
      .filter((c) => c.status === 'OPEN')
      .map((c) => c.mu);

    const calc = calculateAggregateWaitSec(position, activeMus, DEFAULT_SERVICE_DURATION_SEC);
    const totalRatePerMin = calc.totalServiceRatePerSec * 60;

    return {
      position,
      estWaitSec: calc.estWaitSec,
      activeCounters: calc.activeCounters,
      totalServiceRatePerMin: Number(totalRatePerMin.toFixed(2)),
      isCountersPaused: calc.isCountersPaused,
    };
  }

  public getToken(tokenNumber: string): {
    token: Token | null;
    estimate: WaitEstimate;
    counterInfo?: { id: number; name: string };
  } {
    // Check if currently serving
    for (const counter of this.counters) {
      if (counter.currentServingToken?.tokenNumber === tokenNumber) {
        return {
          token: counter.currentServingToken,
          estimate: {
            position: 0,
            estWaitSec: 0,
            activeCounters: this.counters.filter((c) => c.status === 'OPEN').length,
            totalServiceRatePerMin: 0,
            isCountersPaused: false,
          },
          counterInfo: { id: counter.id, name: counter.name },
        };
      }
    }

    // Check waiting queue
    const waitingToken = this.waitingQueue.find((t) => t.tokenNumber === tokenNumber);
    if (waitingToken) {
      const position = this.getTokenPosition(tokenNumber);
      const estimate = this.calculateEstimateForPosition(position);
      return {
        token: waitingToken,
        estimate,
      };
    }

    // Check completed
    const completed = this.completedTokens.find((t) => t.tokenNumber === tokenNumber);
    if (completed) {
      return {
        token: completed,
        estimate: {
          position: 0,
          estWaitSec: 0,
          activeCounters: this.counters.filter((c) => c.status === 'OPEN').length,
          totalServiceRatePerMin: 0,
          isCountersPaused: false,
        },
      };
    }

    return {
      token: null,
      estimate: {
        position: 0,
        estWaitSec: 0,
        activeCounters: 0,
        totalServiceRatePerMin: 0,
        isCountersPaused: true,
      },
    };
  }

  /**
   * Calls next customer to a specific counter.
   * If the counter already has a serving customer, marks them completed
   * and logs service duration to analytics before pulling next token.
   */
  public callNext(counterId: number): {
    counter: Counter;
    calledToken: Token | null;
    completedToken: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter) {
      throw new Error(`Counter ${counterId} not found`);
    }

    if (counter.status !== 'OPEN') {
      throw new Error(`Counter ${counterId} is CLOSED. Open counter first.`);
    }

    const now = Date.now();
    let completedToken: Token | null = null;

    // 1. Complete existing customer if present
    if (counter.currentServingToken) {
      completedToken = counter.currentServingToken;
      const durationSec = counter.serviceStartedAt
        ? Math.max(5, Math.round((now - counter.serviceStartedAt) / 1000))
        : 60;

      completedToken.status = 'COMPLETED';
      completedToken.completedAt = now;
      this.completedTokens.unshift(completedToken);

      // EWMA update: mu_t = alpha * mu_recent + (1 - alpha) * mu_{t-1}
      const updatedMu = calculateEWMA(counter.mu, durationSec, 0.25);
      counter.mu = updatedMu;
      counter.avgServiceDurationSec = Math.round(1 / updatedMu);
      counter.completedCount += 1;
      counter.totalServiceDurationSec += durationSec;
      counter.history.unshift({
        tokenNumber: completedToken.tokenNumber,
        durationSec,
        completedAt: now,
      });

      counter.currentServingToken = null;
      counter.serviceStartedAt = null;
    }

    // 2. Pull next token from queue
    let calledToken: Token | null = null;

    if (this.waitingQueue.length > 0) {
      // Priority or FIFO
      calledToken = this.waitingQueue.shift()!;
      calledToken.status = 'SERVING';
      calledToken.calledAt = now;
      calledToken.servingCounterId = counter.id;
      calledToken.servingCounterName = counter.name;

      counter.currentServingToken = calledToken;
      counter.serviceStartedAt = now;

      // Add to recently called
      this.recentlyCalled.unshift({
        token: calledToken,
        counterId: counter.id,
        counterName: counter.name,
        calledAt: now,
      });
      if (this.recentlyCalled.length > 8) {
        this.recentlyCalled.pop();
      }
    }

    this.refreshApproachingStatuses();
    this.notify();

    return { counter, calledToken, completedToken };
  }

  /**
   * Complete current ticket without pulling next ticket immediately
   */
  public completeCurrent(counterId: number): {
    counter: Counter;
    completedToken: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter) {
      throw new Error(`Counter ${counterId} not found`);
    }

    if (!counter.currentServingToken) {
      return { counter, completedToken: null };
    }

    const now = Date.now();
    const completedToken = counter.currentServingToken;
    const durationSec = counter.serviceStartedAt
      ? Math.max(5, Math.round((now - counter.serviceStartedAt) / 1000))
      : 60;

    completedToken.status = 'COMPLETED';
    completedToken.completedAt = now;
    this.completedTokens.unshift(completedToken);

    const updatedMu = calculateEWMA(counter.mu, durationSec, 0.25);
    counter.mu = updatedMu;
    counter.avgServiceDurationSec = Math.round(1 / updatedMu);
    counter.completedCount += 1;
    counter.totalServiceDurationSec += durationSec;
    counter.history.unshift({
      tokenNumber: completedToken.tokenNumber,
      durationSec,
      completedAt: now,
    });

    counter.currentServingToken = null;
    counter.serviceStartedAt = null;

    this.notify();
    return { counter, completedToken };
  }

  /**
   * Toggles counter status between OPEN and CLOSED.
   * "mid-service closures return the customer to the top of the queue"
   */
  public toggleCounter(
    counterId: number,
    targetStatus?: 'OPEN' | 'CLOSED'
  ): {
    counter: Counter;
    returnedToken: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter) {
      throw new Error(`Counter ${counterId} not found`);
    }

    const newStatus = targetStatus || (counter.status === 'OPEN' ? 'CLOSED' : 'OPEN');
    let returnedToken: Token | null = null;

    if (newStatus === 'CLOSED') {
      // If customer was currently being served, return them to top of queue!
      if (counter.currentServingToken) {
        returnedToken = counter.currentServingToken;
        returnedToken.status = 'WAITING';
        returnedToken.servingCounterId = undefined;
        returnedToken.servingCounterName = undefined;
        returnedToken.calledAt = undefined;

        // Return to the VERY FRONT of the queue
        this.waitingQueue.unshift(returnedToken);

        counter.currentServingToken = null;
        counter.serviceStartedAt = null;
      }
    }

    counter.status = newStatus;
    this.refreshApproachingStatuses();
    this.notify();

    return { counter, returnedToken };
  }

  /**
   * Re-announces the customer currently serving at a counter
   */
  public recallToken(counterId: number): {
    counter: Counter;
    token: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter || !counter.currentServingToken) {
      throw new Error(`Counter ${counterId} is not currently serving a customer`);
    }

    const now = Date.now();
    const token = counter.currentServingToken;
    this.recentlyCalled.unshift({
      token,
      counterId: counter.id,
      counterName: counter.name,
      calledAt: now,
    });
    if (this.recentlyCalled.length > 8) this.recentlyCalled.pop();

    this.notify();
    return { counter, token };
  }

  /**
   * Calls a specific token from the queue to a counter
   */
  public callSpecific(
    counterId: number,
    tokenNumber: string
  ): {
    counter: Counter;
    calledToken: Token;
    completedToken: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter) throw new Error(`Counter ${counterId} not found`);
    if (counter.status !== 'OPEN') throw new Error(`Counter ${counterId} is closed`);

    const tokenIdx = this.waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber);
    if (tokenIdx === -1) throw new Error(`Token ${tokenNumber} is not waiting in queue`);

    const now = Date.now();
    let completedToken: Token | null = null;

    if (counter.currentServingToken) {
      completedToken = counter.currentServingToken;
      const durationSec = counter.serviceStartedAt
        ? Math.max(5, Math.round((now - counter.serviceStartedAt) / 1000))
        : 60;
      completedToken.status = 'COMPLETED';
      completedToken.completedAt = now;
      this.completedTokens.unshift(completedToken);

      const updatedMu = calculateEWMA(counter.mu, durationSec, 0.25);
      counter.mu = updatedMu;
      counter.avgServiceDurationSec = Math.round(1 / updatedMu);
      counter.completedCount += 1;
      counter.totalServiceDurationSec += durationSec;
      counter.history.unshift({
        tokenNumber: completedToken.tokenNumber,
        durationSec,
        completedAt: now,
      });
    }

    const calledToken = this.waitingQueue.splice(tokenIdx, 1)[0];
    calledToken.status = 'SERVING';
    calledToken.calledAt = now;
    calledToken.servingCounterId = counter.id;
    calledToken.servingCounterName = counter.name;

    counter.currentServingToken = calledToken;
    counter.serviceStartedAt = now;

    this.recentlyCalled.unshift({
      token: calledToken,
      counterId: counter.id,
      counterName: counter.name,
      calledAt: now,
    });
    if (this.recentlyCalled.length > 8) this.recentlyCalled.pop();

    this.refreshApproachingStatuses();
    this.notify();

    return { counter, calledToken, completedToken };
  }

  /**
   * Marks current customer as no-show
   */
  public markNoShow(counterId: number): {
    counter: Counter;
    noShowToken: Token | null;
  } {
    const counter = this.counters.find((c) => c.id === counterId);
    if (!counter || !counter.currentServingToken) {
      throw new Error(`Counter ${counterId} is not serving any customer`);
    }

    const noShowToken = counter.currentServingToken;
    noShowToken.status = 'CANCELLED';
    counter.currentServingToken = null;
    counter.serviceStartedAt = null;

    this.notify();
    return { counter, noShowToken };
  }

  /**
   * Fast-track prioritize a token to position 1
   */
  public prioritizeToken(tokenNumber: string): boolean {
    const idx = this.waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber);
    if (idx > 0) {
      const [tok] = this.waitingQueue.splice(idx, 1);
      tok.isPriority = true;
      this.waitingQueue.unshift(tok);
      this.refreshApproachingStatuses();
      this.notify();
      return true;
    } else if (idx === 0) {
      this.waitingQueue[0].isPriority = true;
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Seed a batch of rush simulation tokens
   */
  public seedBatch(count: number = 3): Token[] {
    const sampleNames = [
      'Alexander Vance',
      'Elena Rostova',
      'Maya Lin',
      'Jamal Washington',
      'Chloe Dubois',
      'Mateo Hernandez',
      'Amina Bakhit',
    ];
    const cats: ServiceCategoryId[] = ['GEN', 'DOC', 'CSH', 'LIC', 'PRI'];
    const added: Token[] = [];

    for (let i = 0; i < count; i++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const name = sampleNames[Math.floor(Math.random() * sampleNames.length)];
      const isPri = cat === 'PRI' || Math.random() < 0.2;
      const res = this.issueToken(cat, name, isPri);
      added.push(res.token);
    }
    return added;
  }

  /**
   * Cancel a token
   */
  public cancelToken(tokenNumber: string): boolean {
    const idx = this.waitingQueue.findIndex((t) => t.tokenNumber === tokenNumber);
    if (idx !== -1) {
      this.waitingQueue.splice(idx, 1);
      this.refreshApproachingStatuses();
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Snapshot for broadcast and client views
   */
  public getQueueState(): QueueState & {
    queueLength: number;
    completedCount: number;
    activeCounterCount: number;
    recentQueue: {
      id: string;
      tokenNumber: string;
      serviceType: ServiceCategoryId;
      citizenName?: string;
      status: string;
      createdAt: number;
      isPriority?: boolean;
      waitDurationSec: number;
      estimatedRemainingSec: number;
    }[];
  } {
    const now = Date.now();
    const activeMus = this.counters.filter((c) => c.status === 'OPEN').map((c) => c.mu);

    const recentQueue = this.waitingQueue.map((tok, i) => {
      const pos = i + 1;
      const est = calculateAggregateWaitSec(pos, activeMus, DEFAULT_SERVICE_DURATION_SEC);
      return {
        id: tok.id,
        tokenNumber: tok.tokenNumber,
        serviceType: tok.serviceType,
        citizenName: tok.citizenName,
        status: tok.status,
        createdAt: tok.createdAt,
        isPriority: tok.isPriority,
        waitDurationSec: Math.round((now - tok.createdAt) / 1000),
        estimatedRemainingSec: est.estWaitSec,
      };
    });

    return {
      waitingQueue: this.waitingQueue,
      counters: this.counters,
      completedTokens: this.completedTokens.slice(0, 50),
      recentlyCalled: this.recentlyCalled,
      lastUpdated: now,
      queueLength: this.waitingQueue.length,
      completedCount: this.completedTokens.length,
      activeCounterCount: this.counters.filter((c) => c.status === 'OPEN').length,
      recentQueue,
    };
  }

  /**
   * Aggregate operational analytics including M/M/c queuing formulas
   */
  public getAnalytics(): QueueAnalytics {
    const activeCounters = this.counters.filter((c) => c.status === 'OPEN');
    const cCount = Math.max(1, activeCounters.length);

    // Sum of mu
    const totalMu = activeCounters.reduce((acc, c) => acc + c.mu, 0);
    const avgMu = totalMu / cCount; // tokens / sec per active counter
    const avgServiceTimeSec = avgMu > 0 ? Math.round(1 / avgMu) : DEFAULT_SERVICE_DURATION_SEC;

    // Total served today
    const totalServed = this.completedTokens.length;

    // Calculate actual average wait time from completed items
    let avgWaitTimeSec = 0;
    if (this.completedTokens.length > 0) {
      const waitDurations = this.completedTokens
        .filter((t) => t.calledAt && t.createdAt)
        .map((t) => Math.max(0, Math.round((t.calledAt! - t.createdAt) / 1000)));
      if (waitDurations.length > 0) {
        avgWaitTimeSec = Math.round(
          waitDurations.reduce((a, b) => a + b, 0) / waitDurations.length
        );
      }
    }

    // Category breakdown
    const categoryStats: Record<ServiceCategoryId, any> = {
      GEN: { totalIssued: 0, waiting: 0, completed: 0, avgWaitSec: 0 },
      DOC: { totalIssued: 0, waiting: 0, completed: 0, avgWaitSec: 0 },
      CSH: { totalIssued: 0, waiting: 0, completed: 0, avgWaitSec: 0 },
      LIC: { totalIssued: 0, waiting: 0, completed: 0, avgWaitSec: 0 },
      PRI: { totalIssued: 0, waiting: 0, completed: 0, avgWaitSec: 0 },
    };

    for (const catId of Object.keys(categoryStats) as ServiceCategoryId[]) {
      const waiting = this.waitingQueue.filter((t) => t.serviceType === catId).length;
      const completed = this.completedTokens.filter((t) => t.serviceType === catId);
      const waits = completed
        .filter((t) => t.calledAt && t.createdAt)
        .map((t) => (t.calledAt! - t.createdAt) / 1000);
      const catAvgWait =
        waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

      categoryStats[catId] = {
        totalIssued: waiting + completed.length,
        waiting,
        completed: completed.length,
        avgWaitSec: catAvgWait,
      };
    }

    // Estimated arrival rate lambda (tokens per second)
    // Approximate from arrivals or queue depth
    const lambdaPerSec = Math.max(0.01, (totalServed + this.waitingQueue.length) / (2 * 3600)); // over ~2 hours
    const lambdaPerMin = lambdaPerSec * 60;
    const serviceRatePerMin = totalMu * 60;

    // Erlang-C calculation
    const erlangC = calculateErlangC(cCount, lambdaPerSec, avgMu);

    return {
      activeCounterCount: activeCounters.length,
      totalCounters: this.counters.length,
      queueDepth: this.waitingQueue.length,
      totalServedToday: totalServed,
      avgWaitTimeSec,
      avgServiceTimeSec,
      totalThroughputPerHour: Math.round(totalMu * 3600),
      categoryStats,
      mmcStats: {
        arrivalRatePerMin: Number(lambdaPerMin.toFixed(2)),
        serviceRatePerMin: Number(serviceRatePerMin.toFixed(2)),
        utilizationRho: erlangC.utilization,
        erlangCWaitProbability: Number(erlangC.erlangCProbability.toFixed(3)),
        theoreticalWaitSec: erlangC.theoreticalWaitSec,
      },
    };
  }
}

export const queueStore = new QueueStore();
