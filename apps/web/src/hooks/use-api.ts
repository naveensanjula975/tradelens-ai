'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDashboard,
  listPositions,
  listInventory,
  listShipments,
  listCounterparties,
  listAlerts,
} from '@/lib/api-client';
import type { DashboardData, Position, Inventory, Shipment, Counterparty, Alert } from '@/types/domain';

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
