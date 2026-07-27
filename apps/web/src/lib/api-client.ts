import { DashboardData, Position, Inventory, Shipment, Counterparty, Alert } from '@/types/domain';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── CSV Upload Types ───────────────────────────────────────────────────────────

export type CSVImportType = 'positions' | 'inventory' | 'shipments';

export interface CSVImportValidationError {
  row: number;
  column: string;
  code: string;
  message: string;
}

export interface CSVImportResponse {
  message: string;
  imported_count: number;
  file_type: CSVImportType;
}

interface CSVImportErrorResponse {
  detail: {
    message: string;
    errors: CSVImportValidationError[];
  };
}

export class CSVUploadError extends Error {
  errors: CSVImportValidationError[];

  constructor(message: string, errors: CSVImportValidationError[] = []) {
    super(message);
    this.name = 'CSVUploadError';
    this.errors = errors;
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
  }
  return res.json() as Promise<T>;
}

function isCSVImportErrorResponse(value: unknown): value is CSVImportErrorResponse {
  if (!value || typeof value !== 'object' || !('detail' in value)) return false;
  const detail = (value as Record<string, unknown>).detail;
  return Boolean(
    detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as Record<string, unknown>).message === 'string' &&
      'errors' in detail &&
      Array.isArray((detail as Record<string, unknown>).errors),
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export async function fetchDashboard(commodity: string = 'Copper'): Promise<DashboardData> {
  try {
    return await apiFetch<DashboardData>(`/api/dashboard/${encodeURIComponent(commodity)}`);
  } catch (err) {
    console.warn('Using fallback mock data as backend API is offline:', err);
    return getFallbackDashboardData(commodity);
  }
}

// ── Positions ──────────────────────────────────────────────────────────────────

export async function listPositions(commodity?: string): Promise<Position[]> {
  const qs = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
  try {
    return await apiFetch<Position[]>(`/api/positions${qs}`);
  } catch {
    return getFallbackDashboardData(commodity ?? 'Copper').positions;
  }
}

export async function createPosition(data: Omit<Position, 'id'>): Promise<Position> {
  return apiFetch<Position>('/api/positions', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePosition(id: string, data: Omit<Position, 'id'>): Promise<Position> {
  return apiFetch<Position>(`/api/positions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePosition(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/positions/${id}`, { method: 'DELETE' });
}

// ── Inventory ──────────────────────────────────────────────────────────────────

export async function listInventory(commodity?: string): Promise<Inventory[]> {
  const qs = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
  try {
    return await apiFetch<Inventory[]>(`/api/inventory${qs}`);
  } catch {
    return getFallbackDashboardData(commodity ?? 'Copper').inventory;
  }
}

export async function createInventory(data: Omit<Inventory, 'id'>): Promise<Inventory> {
  return apiFetch<Inventory>('/api/inventory', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateInventory(id: string, data: Omit<Inventory, 'id'>): Promise<Inventory> {
  return apiFetch<Inventory>(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteInventory(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/inventory/${id}`, { method: 'DELETE' });
}

// ── Shipments ──────────────────────────────────────────────────────────────────

export async function listShipments(commodity?: string): Promise<Shipment[]> {
  const qs = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
  try {
    return await apiFetch<Shipment[]>(`/api/shipments${qs}`);
  } catch {
    return getFallbackDashboardData(commodity ?? 'Copper').shipments;
  }
}

export async function createShipment(data: Omit<Shipment, 'id'>): Promise<Shipment> {
  return apiFetch<Shipment>('/api/shipments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateShipment(id: string, data: Omit<Shipment, 'id'>): Promise<Shipment> {
  return apiFetch<Shipment>(`/api/shipments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteShipment(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/shipments/${id}`, { method: 'DELETE' });
}

// ── Counterparties ─────────────────────────────────────────────────────────────

export async function listCounterparties(): Promise<Counterparty[]> {
  try {
    return await apiFetch<Counterparty[]>('/api/counterparties');
  } catch {
    return getFallbackDashboardData('Copper').counterparties;
  }
}

export async function createCounterparty(data: Omit<Counterparty, 'id'>): Promise<Counterparty> {
  return apiFetch<Counterparty>('/api/counterparties', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCounterparty(id: string, data: Omit<Counterparty, 'id'>): Promise<Counterparty> {
  return apiFetch<Counterparty>(`/api/counterparties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCounterparty(id: string): Promise<void> {
  await apiFetch<unknown>(`/api/counterparties/${id}`, { method: 'DELETE' });
}

// ── Alerts ─────────────────────────────────────────────────────────────────────

export async function listAlerts(commodity?: string): Promise<Alert[]> {
  const qs = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
  try {
    return await apiFetch<Alert[]>(`/api/alerts${qs}`);
  } catch {
    return getFallbackDashboardData(commodity ?? 'Copper').alerts;
  }
}

// ── CSV Upload ─────────────────────────────────────────────────────────────────

export async function uploadCSV(type: CSVImportType, file: File): Promise<CSVImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/uploads/${type}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData: unknown = await res.json().catch(() => null);
    if (isCSVImportErrorResponse(errorData)) {
      throw new CSVUploadError(errorData.detail.message, errorData.detail.errors);
    }
    throw new CSVUploadError('Upload failed. Please verify the file and try again.');
  }

  return (await res.json()) as CSVImportResponse;
}

// ── Brief export ───────────────────────────────────────────────────────────────

export async function exportBrief(commodity: string): Promise<{ commodity: string; content: string }> {
  return apiFetch(`/api/briefs/export?commodity=${encodeURIComponent(commodity)}`, { method: 'POST' });
}

// ── Fallback data ──────────────────────────────────────────────────────────────

export function getFallbackDashboardData(commodity: string): DashboardData {
  return {
    commodity,
    decision: {
      commodity,
      market_state: 'Logistics Disruption',
      permission: 'Blocked',
      evidence_score: 58,
      risk_score: 81,
      confidence_score: 92,
      summary: 'Increasing exposure is blocked due to shipment delays and limited inventory coverage.',
      supporting_evidence: ['Counterparty exposure within acceptable range.'],
      blocking_factors: [
        'Primary copper shipment from Chile is delayed by 6 days.',
        'Rotterdam inventory is 44% below minimum requirement.',
      ],
    },
    ai_brief: {
      headline: 'Increasing exposure is currently blocked.',
      summary: 'A delayed shipment from Chile combined with low Rotterdam inventory creates elevated delivery risk.',
      why: [
        'The primary shipment from Chile to Singapore is delayed by six days.',
        'Available inventory in Rotterdam covers only 8 days of operational demand.',
        'Counterparty Global Metals Ltd utilisation is at 91% of credit limit.',
      ],
      next_actions: [
        'Confirm the revised vessel arrival date with maritime handler.',
        'Review spot allocation from Antwerp warehouse buffer stock.',
        'Avoid adding unhedged long exposure until logistics risk falls.',
      ],
    },
    alerts: [
      {
        id: 'alt-1', commodity, category: 'logistics', severity: 'high',
        title: 'Shipment Delayed',
        description: 'Shipment from Chile to Singapore delayed by 6 days',
        evidence: ['Chile port loading delay'],
        recommended_action: 'Confirm vessel ETA and re-route spot deliveries.',
      },
      {
        id: 'alt-2', commodity, category: 'inventory', severity: 'high',
        title: 'Inventory Below Minimum',
        description: 'Rotterdam Vault (280 MT) is 44% below minimum requirement (500 MT)',
        evidence: ['Physical audit report'],
        recommended_action: 'Halt new physical delivery sales.',
      },
    ],
    positions: [
      { id: '1', commodity, instrument: 'LME Future', direction: 'Long', quantity: 250, unit: 'MT', entry_price: 9410, market_price: 9475, currency: 'USD', counterparty: 'Global Metals Ltd' },
      { id: '2', commodity, instrument: 'Physical', direction: 'Long', quantity: 120, unit: 'MT', entry_price: 9320, market_price: 9475, currency: 'USD', counterparty: 'Northstar Trading' },
    ],
    inventory: [
      { id: 'inv-1', commodity, location: 'Rotterdam Vault', quantity: 350, unit: 'MT', minimum_required: 500, available_quantity: 280 },
      { id: 'inv-2', commodity, location: 'Singapore Port', quantity: 180, unit: 'MT', minimum_required: 200, available_quantity: 150 },
    ],
    shipments: [
      { id: 'shp-1', commodity, origin: 'Chile', destination: 'Singapore', quantity: 400, unit: 'MT', expected_arrival: '2026-07-21', status: 'Delayed', delay_days: 6 },
      { id: 'shp-2', commodity, origin: 'Peru', destination: 'Colombo', quantity: 180, unit: 'MT', expected_arrival: '2026-07-30', status: 'In Transit', delay_days: 0 },
    ],
    counterparties: [
      { id: 'cp_01', name: 'Global Metals Ltd', credit_limit: 5000000, current_exposure: 4550000, risk_rating: 'BB+' },
      { id: 'cp_02', name: 'Northstar Trading', credit_limit: 3000000, current_exposure: 1200000, risk_rating: 'A-' },
    ],
  };
}
