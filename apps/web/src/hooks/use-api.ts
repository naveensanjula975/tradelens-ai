'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboard,
  listPositions,
  listInventory,
  listShipments,
  listCounterparties,
  listAlerts,
  listMarketEvents,
  listDecisionHistory,
  listRiskLimits,
  fetchAnalyticsSummary,
} from '@/lib/api-client';
import type { DashboardData, Position, Inventory, Shipment, Counterparty, Alert, MarketEvent, DecisionHistoryEntry, RiskLimit, PortfolioAnalytics } from '@/types/domain';


// ── Dashboard hook ─────────────────────────────────────────────────────────────

export function useDashboard(commodity: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboard(commodity);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Positions hook ─────────────────────────────────────────────────────────────

export function usePositions(commodity?: string) {
  const [data, setData] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPositions(commodity);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Inventory hook ─────────────────────────────────────────────────────────────

export function useInventory(commodity?: string) {
  const [data, setData] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listInventory(commodity);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Shipments hook ─────────────────────────────────────────────────────────────

export function useShipments(commodity?: string) {
  const [data, setData] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listShipments(commodity);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Counterparties hook ────────────────────────────────────────────────────────

export function useCounterparties() {
  const [data, setData] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCounterparties();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counterparties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Alerts hook ────────────────────────────────────────────────────────────────

export function useAlerts(commodity?: string) {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAlerts(commodity);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}

// ── Market Events hook ───────────────────────────────────────────────

export function useMarketEvents(commodity?: string) {
  const [data, setData] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listMarketEvents(commodity));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market events');
    } finally {
      setLoading(false);
    }
  }, [commodity]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

// ── Decision History hook ────────────────────────────────────────────

export function useDecisionHistory(commodity: string, limit = 30) {
  const [data, setData] = useState<DecisionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listDecisionHistory(commodity, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decision history');
    } finally {
      setLoading(false);
    }
  }, [commodity, limit]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

// ── Risk Limits hook ──────────────────────────────────────────────────────

export function useRiskLimits() {
  const [data, setData] = useState<RiskLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listRiskLimits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk limits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

// ── Portfolio Analytics hook ──────────────────────────────────────────────

export function usePortfolioAnalytics() {
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAnalyticsSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}
