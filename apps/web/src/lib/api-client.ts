import { DashboardData } from '@/types/domain';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export async function fetchDashboard(commodity: string = 'Copper'): Promise<DashboardData> {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/${commodity}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('API request failed');
    return await res.json();
  } catch (err) {
    console.warn("Using fallback mock data as backend API is offline:", err);
    return getFallbackDashboardData(commodity);
  }
}

function isCSVImportErrorResponse(value: unknown): value is CSVImportErrorResponse {
  if (!value || typeof value !== 'object' || !('detail' in value)) return false;
  const detail = value.detail;
  return Boolean(
    detail
      && typeof detail === 'object'
      && 'message' in detail
      && typeof detail.message === 'string'
      && 'errors' in detail
      && Array.isArray(detail.errors),
  );
}

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

  return await res.json() as CSVImportResponse;
}

function getFallbackDashboardData(commodity: string): DashboardData {
  return {
    commodity: commodity,
    decision: {
      commodity: commodity,
      market_state: 'Logistics Disruption',
      permission: 'Blocked',
      evidence_score: 58,
      risk_score: 81,
      confidence_score: 92,
      summary: 'Increasing exposure is blocked due to shipment delays and limited inventory coverage.',
      supporting_evidence: ['Counterparty exposure within acceptable range.'],
      blocking_factors: ['Primary copper shipment from Chile is delayed by 6 days.', 'Rotterdam inventory is 44% below minimum requirement.']
    },
    ai_brief: {
      headline: 'Increasing exposure is currently blocked.',
      summary: 'A delayed shipment from Chile combined with low Rotterdam inventory creates elevated delivery risk.',
      why: [
        'The primary shipment from Chile to Singapore is delayed by six days.',
        'Available inventory in Rotterdam covers only 8 days of operational demand.',
        'Counterparty Global Metals Ltd utilisation is at 91% of limit.'
      ],
      next_actions: [
        'Confirm the revised vessel arrival date with maritime handler.',
        'Review spot allocation from Antwerp warehouse buffer stock.',
        'Avoid adding unhedged long exposure until logistics risk falls.'
      ]
    },
    alerts: [
      {
        id: 'alt-1',
        commodity: commodity,
        category: 'logistics',
        severity: 'high',
        title: 'Shipment Delayed',
        description: 'Shipment from Chile to Singapore delayed by 6 days',
        evidence: ['Chile port loading delay'],
        recommended_action: 'Confirm vessel ETA and re-route spot deliveries.'
      },
      {
        id: 'alt-2',
        commodity: commodity,
        category: 'inventory',
        severity: 'high',
        title: 'Inventory Below Minimum',
        description: 'Rotterdam Vault (280 MT) is 44% below minimum requirement (500 MT)',
        evidence: ['Physical audit report'],
        recommended_action: 'Halt new physical delivery sales.'
      }
    ],
    positions: [
      { id: '1', commodity: commodity, instrument: 'LME Future', direction: 'Long', quantity: 250, unit: 'MT', entry_price: 9410, market_price: 9475, currency: 'USD', counterparty: 'Global Metals Ltd' },
      { id: '2', commodity: commodity, instrument: 'Physical', direction: 'Long', quantity: 120, unit: 'MT', entry_price: 9320, market_price: 9475, currency: 'USD', counterparty: 'Northstar Trading' }
    ],
    inventory: [
      { id: 'inv-1', commodity: commodity, location: 'Rotterdam Vault', quantity: 350, unit: 'MT', minimum_required: 500, available_quantity: 280 },
      { id: 'inv-2', commodity: commodity, location: 'Singapore Port', quantity: 180, unit: 'MT', minimum_required: 200, available_quantity: 150 }
    ],
    shipments: [
      { id: 'shp-1', commodity: commodity, origin: 'Chile', destination: 'Singapore', quantity: 400, unit: 'MT', expected_arrival: '2026-07-21', status: 'Delayed', delay_days: 6 },
      { id: 'shp-2', commodity: commodity, origin: 'Peru', destination: 'Colombo', quantity: 180, unit: 'MT', expected_arrival: '2026-07-30', status: 'In Transit', delay_days: 0 }
    ],
    counterparties: [
      { id: 'cp_01', name: 'Global Metals Ltd', credit_limit: 5000000, current_exposure: 4550000, risk_rating: 'BB+' },
      { id: 'cp_02', name: 'Northstar Trading', credit_limit: 3000000, current_exposure: 1200000, risk_rating: 'A-' }
    ]
  };
}
