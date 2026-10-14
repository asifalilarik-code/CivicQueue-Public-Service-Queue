import { useState, useEffect, useRef, useCallback } from 'react';
import { QueueState, QueueAnalytics, Token, WaitEstimate, ServiceCategoryId } from '../types/queue.ts';
import { playCallingChime, speakCallingAnnouncement } from '../utils/audioChime.ts';

export function useQueueSocket() {
  const [queueState, setQueueState] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<QueueAnalytics | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastCalledAlert, setLastCalledAlert] = useState<{
    token: Token;
    counterId: number;
    counterName: string;
    timestamp: number;
  } | null>(null);

  // Citizen's active token stored in localStorage
  const [activeTokenNumber, setActiveTokenNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('civic_active_token');
    }
    return null;
  });

  const [activeTokenDetails, setActiveTokenDetails] = useState<{
    token: Token | null;
    estimate: WaitEstimate;
    counterInfo?: { id: number; name: string };
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isCallingFlash, setIsCallingFlash] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Fetch analytics periodically or on updates
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.warn('Could not fetch analytics:', err);
    }
  }, []);

  // Fetch active token status
  const fetchActiveTokenStatus = useCallback(async (tokenNum: string) => {
    try {
      const res = await fetch(`/api/tokens/${tokenNum}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTokenDetails(data);
      } else if (res.status === 404) {
        // If not found, could be completed or removed
        const data = await res.json();
        setActiveTokenDetails((prev) => (prev ? { ...prev, estimate: data.estimate } : null));
      }
    } catch (err) {
      console.warn('Error fetching token details:', err);
    }
  }, []);

  // Sync token whenever queueState or activeTokenNumber changes
  useEffect(() => {
    if (activeTokenNumber) {
      fetchActiveTokenStatus(activeTokenNumber);
    } else {
      setActiveTokenDetails(null);
    }
  }, [activeTokenNumber, queueState, fetchActiveTokenStatus]);

  // Connect WebSocket
  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setIsConnected(true);
        fetchAnalytics();
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'QUEUE_INIT' || msg.type === 'QUEUE_UPDATE') {
            setQueueState(msg.payload);
            fetchAnalytics();
          } else if (msg.type === 'TOKEN_CALLED') {
            const { token, counterId, counterName } = msg.payload;
            setLastCalledAlert({
              token,
              counterId,
              counterName,
              timestamp: Date.now(),
            });

            // Check if this was the current user's token!
            const myTokenNum = localStorage.getItem('civic_active_token');
            const isMyToken = myTokenNum && token.tokenNumber === myTokenNum;

            if (soundEnabled) {
              playCallingChime();
            }
            if (voiceEnabled) {
              speakCallingAnnouncement(token.tokenNumber, counterName);
            }

            if (isMyToken) {
              // Flash green screen for citizen
              setIsCallingFlash(true);
              setTimeout(() => setIsCallingFlash(false), 5000);
            }
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setIsConnected(false);
        // Exponential reconnect attempt
        reconnectTimeoutRef.current = setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [fetchAnalytics, soundEnabled, voiceEnabled]);

  // Actions
  const issueToken = async (
    serviceType: ServiceCategoryId,
    citizenName?: string,
    isPriority?: boolean,
    extraData?: { cnic?: string; phone?: string }
  ) => {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType,
        citizenName,
        isPriority,
        cnic: extraData?.cnic,
        phone: extraData?.phone,
      }),
    });
    if (!res.ok) throw new Error('Failed to issue token');
    const data = await res.json();
    return data;
  };

  const registerUserToken = (tokenNumber: string) => {
    localStorage.setItem('civic_active_token', tokenNumber);
    setActiveTokenNumber(tokenNumber);
  };

  const clearUserToken = () => {
    localStorage.removeItem('civic_active_token');
    setActiveTokenNumber(null);
    setActiveTokenDetails(null);
  };

  const callNext = async (counterId: number) => {
    const res = await fetch(`/api/counters/${counterId}/call-next`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to call next customer');
    }
    return await res.json();
  };

  const completeCounter = async (counterId: number) => {
    const res = await fetch(`/api/counters/${counterId}/complete`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to complete customer');
    }
    return await res.json();
  };

  const toggleCounter = async (counterId: number, status?: 'OPEN' | 'CLOSED') => {
    const res = await fetch(`/api/counters/${counterId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle counter');
    }
    return await res.json();
  };

  const cancelToken = async (tokenNumber: string) => {
    const res = await fetch(`/api/tokens/${tokenNumber}/cancel`, {
      method: 'POST',
    });
    if (tokenNumber === activeTokenNumber) {
      clearUserToken();
    }
    return await res.json();
  };

  const recallCustomer = async (counterId: number) => {
    const res = await fetch(`/api/counters/${counterId}/recall`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to recall customer');
    }
    return await res.json();
  };

  const callSpecificToken = async (counterId: number, tokenNumber: string) => {
    const res = await fetch(`/api/counters/${counterId}/call-specific`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenNumber }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to call token');
    }
    return await res.json();
  };

  const markNoShow = async (counterId: number) => {
    const res = await fetch(`/api/counters/${counterId}/no-show`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark no-show');
    }
    return await res.json();
  };

  const prioritizeToken = async (tokenNumber: string) => {
    const res = await fetch(`/api/tokens/${tokenNumber}/prioritize`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to prioritize token');
    }
    return await res.json();
  };

  const seedBatch = async (count: number = 3) => {
    const res = await fetch('/api/seed-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    return await res.json();
  };

  const resetDemo = async () => {
    await fetch('/api/reset-demo', { method: 'POST' });
  };

  return {
    queueState,
    analytics,
    isConnected,
    activeTokenNumber,
    activeTokenDetails,
    lastCalledAlert,
    soundEnabled,
    voiceEnabled,
    isCallingFlash,
    setSoundEnabled,
    setVoiceEnabled,
    issueToken,
    registerUserToken,
    clearUserToken,
    callNext,
    completeCounter,
    toggleCounter,
    cancelToken,
    recallCustomer,
    callSpecificToken,
    markNoShow,
    prioritizeToken,
    seedBatch,
    resetDemo,
  };
}
