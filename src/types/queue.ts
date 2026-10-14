export type ServiceCategoryId = 'GEN' | 'DOC' | 'CSH' | 'LIC' | 'PRI';

export interface ServiceCategory {
  id: ServiceCategoryId;
  prefix: string;
  name: string;
  description: string;
  baseDurationSec: number;
  color: string;
  iconName: string;
}

export type TokenStatus = 'WAITING' | 'APPROACHING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface Token {
  id: string;
  tokenNumber: string;
  serviceType: ServiceCategoryId;
  citizenName?: string;
  status: TokenStatus;
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
  servingCounterId?: number;
  servingCounterName?: string;
  isPriority?: boolean;
  userId?: string;
  citizenCnicMasked?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  positionInQueue?: number;
  cnic?: string;
  phone?: string;
}

export interface Counter {
  id: number;
  name: string;
  categorySpecialty?: ServiceCategoryId | 'ALL';
  status: 'OPEN' | 'CLOSED';
  currentServingToken: Token | null;
  serviceStartedAt: number | null;
  completedCount: number;
  totalServiceDurationSec: number;
  mu: number; // EWMA throughput rate in tokens per second
  avgServiceDurationSec: number; // 1 / mu
  history: {
    tokenNumber: string;
    durationSec: number;
    completedAt: number;
  }[];
}

export interface WaitEstimate {
  position: number;
  estWaitSec: number;
  activeCounters: number;
  totalServiceRatePerMin: number;
  isCountersPaused: boolean;
}

export interface QueueState {
  waitingQueue: Token[];
  counters: Counter[];
  completedTokens: Token[];
  recentlyCalled: {
    token: Token;
    counterId: number;
    counterName: string;
    calledAt: number;
  }[];
  lastUpdated: number;
}

export interface QueueAnalytics {
  activeCounterCount: number;
  totalCounters: number;
  queueDepth: number;
  totalServedToday: number;
  avgWaitTimeSec: number;
  avgServiceTimeSec: number;
  totalThroughputPerHour: number;
  categoryStats: Record<ServiceCategoryId, {
    totalIssued: number;
    waiting: number;
    completed: number;
    avgWaitSec: number;
  }>;
  mmcStats: {
    arrivalRatePerMin: number;
    serviceRatePerMin: number;
    utilizationRho: number;
    erlangCWaitProbability: number;
    theoreticalWaitSec: number;
  };
}

export type WebSocketMessageType =
  | 'QUEUE_INIT'
  | 'QUEUE_UPDATE'
  | 'TOKEN_CALLED'
  | 'TOKEN_ISSUED'
  | 'TOKEN_COMPLETED'
  | 'COUNTER_TOGGLED';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: number;
}
