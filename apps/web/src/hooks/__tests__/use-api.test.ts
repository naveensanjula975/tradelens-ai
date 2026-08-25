/**
 * Tests for use-api.ts custom hooks.
 * Covers useMarketEvents, usePositions, useDashboard,
 * useInventory, useShipments, useCounterparties, and useAlerts.
 *
 * All hooks follow the same pattern: they call the API client on mount,
 * expose { data, loading, error, refresh }, and handle errors gracefully.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// ── Module mocks ───────────────────────────────────────────────────────────────

jest.mock('@/lib/api-client', () => ({
  listMarketEvents: jest.fn(),
  listPositions: jest.fn(),
  fetchDashboard: jest.fn(),
  listInventory: jest.fn(),
  listShipments: jest.fn(),
  listCounterparties: jest.fn(),
  listAlerts: jest.fn(),
  listDecisionHistory: jest.fn(),
  listRiskLimits: jest.fn(),
  fetchAnalyticsSummary: jest.fn(),
}));

import {
  useMarketEvents,
  usePositions,
  useDashboard,
  useInventory,
  useShipments,
  useCounterparties,
  useAlerts,
} from '@/hooks/use-api';

import {
  listMarketEvents,
  listPositions,
  fetchDashboard,
  listInventory,
  listShipments,
  listCounterparties,
  listAlerts,
} from '@/lib/api-client';

const mockListMarketEvents = listMarketEvents as jest.MockedFunction<typeof listMarketEvents>;
const mockListPositions = listPositions as jest.MockedFunction<typeof listPositions>;
const mockFetchDashboard = fetchDashboard as jest.MockedFunction<typeof fetchDashboard>;
const mockListInventory = listInventory as jest.MockedFunction<typeof listInventory>;
const mockListShipments = listShipments as jest.MockedFunction<typeof listShipments>;
const mockListCounterparties = listCounterparties as jest.MockedFunction<typeof listCounterparties>;
const mockListAlerts = listAlerts as jest.MockedFunction<typeof listAlerts>;

// ── useMarketEvents ────────────────────────────────────────────────────────────

describe('useMarketEvents', () => {
  const EVENTS = [
    { id: 'evt-1', commodity: 'Copper', title: 'Port Strike', impact_level: 'High', description: 'Desc', source: 'Reuters', date: '2026-07-28' },
  ];

  beforeEach(() => mockListMarketEvents.mockClear());

  it('starts with loading=true and empty data', () => {
    mockListMarketEvents.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useMarketEvents('Copper'));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('sets data and loading=false after successful fetch', async () => {
    mockListMarketEvents.mockResolvedValueOnce(EVENTS);
    const { result } = renderHook(() => useMarketEvents('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(EVENTS);
    expect(result.current.error).toBeNull();
  });

  it('sets error and loading=false when fetch fails', async () => {
    mockListMarketEvents.mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useMarketEvents('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network down');
    expect(result.current.data).toEqual([]);
  });

  it('calls listMarketEvents with the provided commodity', async () => {
    mockListMarketEvents.mockResolvedValueOnce([]);
    renderHook(() => useMarketEvents('Aluminium'));

    await waitFor(() => expect(mockListMarketEvents).toHaveBeenCalledWith('Aluminium'));
  });

  it('refresh() re-fetches events', async () => {
    mockListMarketEvents.mockResolvedValue([]);
    const { result } = renderHook(() => useMarketEvents('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListMarketEvents).toHaveBeenCalledTimes(1);

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(mockListMarketEvents).toHaveBeenCalledTimes(2));
  });

  it('re-fetches when commodity prop changes', async () => {
    mockListMarketEvents.mockResolvedValue([]);
    const { rerender } = renderHook(({ c }: { c: string }) => useMarketEvents(c), {
      initialProps: { c: 'Copper' },
    });

    await waitFor(() => expect(mockListMarketEvents).toHaveBeenCalledWith('Copper'));

    rerender({ c: 'Zinc' });
    await waitFor(() => expect(mockListMarketEvents).toHaveBeenCalledWith('Zinc'));
  });
});

// ── usePositions ───────────────────────────────────────────────────────────────

describe('usePositions', () => {
  const POSITIONS = [
    { id: '1', commodity: 'Copper', instrument: 'Future', direction: 'Long' as const, quantity: 250, unit: 'MT', entry_price: 9410, market_price: 9475, currency: 'USD', counterparty: 'Global Metals Ltd' },
  ];

  beforeEach(() => mockListPositions.mockClear());

  it('fetches and returns positions successfully', async () => {
    mockListPositions.mockResolvedValueOnce(POSITIONS);
    const { result } = renderHook(() => usePositions('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(POSITIONS);
  });

  it('handles errors gracefully', async () => {
    mockListPositions.mockRejectedValueOnce(new Error('Timeout'));
    const { result } = renderHook(() => usePositions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Timeout');
  });

  it('exposes a working refresh function', async () => {
    mockListPositions.mockResolvedValue([]);
    const { result } = renderHook(() => usePositions('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(mockListPositions).toHaveBeenCalledTimes(2));
  });
});

// ── useDashboard ───────────────────────────────────────────────────────────────

describe('useDashboard', () => {
  const DASHBOARD = {
    commodity: 'Copper',
    decision: {
      commodity: 'Copper', market_state: 'Stable', permission: 'Allowed',
      evidence_score: 85, risk_score: 20, confidence_score: 90,
      summary: 'All clear', supporting_evidence: [], blocking_factors: [],
    },
    ai_brief: { headline: 'OK', summary: 'OK', why: [], next_actions: [] },
    alerts: [], positions: [], inventory: [], shipments: [], counterparties: [],
  };

  beforeEach(() => mockFetchDashboard.mockClear());

  it('loads dashboard data and sets loading=false', async () => {
    mockFetchDashboard.mockResolvedValueOnce(DASHBOARD);
    const { result } = renderHook(() => useDashboard('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.commodity).toBe('Copper');
  });

  it('sets error message on fetch failure', async () => {
    mockFetchDashboard.mockRejectedValueOnce(new Error('Backend down'));
    const { result } = renderHook(() => useDashboard('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Backend down');
    expect(result.current.data).toBeNull();
  });
});

// ── useInventory ───────────────────────────────────────────────────────────────

describe('useInventory', () => {
  it('fetches inventory and returns data', async () => {
    const inv = [{ id: 'inv-1', commodity: 'Copper', location: 'Rotterdam', quantity: 350, unit: 'MT', minimum_required: 500, available_quantity: 280 }];
    mockListInventory.mockResolvedValueOnce(inv);
    const { result } = renderHook(() => useInventory('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(inv);
  });
});

// ── useShipments ───────────────────────────────────────────────────────────────

describe('useShipments', () => {
  it('fetches shipments and returns data', async () => {
    const shpms = [{ id: 'shp-1', commodity: 'Copper', origin: 'Chile', destination: 'Singapore', quantity: 400, unit: 'MT', expected_arrival: '2026-07-21', status: 'Delayed', delay_days: 6 }];
    mockListShipments.mockResolvedValueOnce(shpms);
    const { result } = renderHook(() => useShipments('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0].delay_days).toBe(6);
  });
});

// ── useCounterparties ──────────────────────────────────────────────────────────

describe('useCounterparties', () => {
  it('fetches counterparties and returns data', async () => {
    const cps = [{ id: 'cp-1', name: 'Global Metals Ltd', credit_limit: 5_000_000, current_exposure: 4_600_000, risk_rating: 'BB+' }];
    mockListCounterparties.mockResolvedValueOnce(cps);
    const { result } = renderHook(() => useCounterparties());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0].name).toBe('Global Metals Ltd');
  });
});

// ── useAlerts ─────────────────────────────────────────────────────────────────

describe('useAlerts', () => {
  it('fetches alerts and returns data', async () => {
    const alerts = [{ id: 'alt-1', commodity: 'Copper', category: 'logistics', severity: 'high', title: 'Delay', description: 'Delayed', evidence: [], recommended_action: 'Act' }];
    mockListAlerts.mockResolvedValueOnce(alerts);
    const { result } = renderHook(() => useAlerts('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0].severity).toBe('high');
  });

  it('sets generic error message for non-Error rejections', async () => {
    mockListAlerts.mockRejectedValueOnce('string error');
    const { result } = renderHook(() => useAlerts('Copper'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load alerts');
  });
});
