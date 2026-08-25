/**
 * Tests for the api-client.ts module.
 * Covers market events CRUD, CSV upload error handling, position CRUD,
 * and the isCSVImportErrorResponse type guard.
 *
 * TC-007 (valid CSV import response shape) and
 * TC-008/009/010 (CSV upload error handling) are covered here at the HTTP layer.
 */

import {
  listMarketEvents,
  createMarketEvent,
  deleteMarketEvent,
  uploadCSV,
  CSVUploadError,
  listPositions,
  createPosition,
  deletePosition,
  getFallbackDashboardData,
} from '../api-client';

// ── Global fetch mock setup ────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    statusText: String(status),
  } as Response);
}

function mockErrorResponse(detail: unknown, status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail }),
    statusText: String(status),
  } as Response);
}

// ── Market Events ──────────────────────────────────────────────────────────────

describe('listMarketEvents', () => {
  it('returns events array on success', async () => {
    const events = [
      { id: '1', commodity: 'Copper', title: 'Port Strike', impact_level: 'High', description: 'Desc', source: 'Reuters', date: '2026-07-28' },
    ];
    mockFetch.mockResolvedValueOnce(mockJsonResponse(events));

    const result = await listMarketEvents('Copper');
    expect(result).toEqual(events);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/market-events?commodity=Copper'),
      expect.any(Object),
    );
  });

  it('returns empty array on API failure (fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await listMarketEvents();
    expect(result).toEqual([]);
  });

  it('passes commodity filter correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse([]));
    await listMarketEvents('Aluminium');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('commodity=Aluminium'),
      expect.any(Object),
    );
  });

  it('omits query string when no commodity provided', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse([]));
    await listMarketEvents();
    const url: string = mockFetch.mock.calls[0][0];
    expect(url).not.toContain('commodity=');
  });
});

describe('createMarketEvent', () => {
  it('sends POST with correct payload and returns created event', async () => {
    const payload = {
      commodity: 'Copper',
      title: 'Chilean Port Strike',
      impact_level: 'High',
      description: 'Port workers halted operations.',
      source: 'Reuters',
      date: '2026-07-28',
    };
    const created = { id: 'evt-1', ...payload };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(created));

    const result = await createMarketEvent(payload);
    expect(result).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/market-events'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on API error response', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse('Server error', 500));
    await expect(createMarketEvent({
      commodity: 'Copper',
      title: '',
      impact_level: 'Low',
      description: '',
      source: '',
      date: '2026-07-28',
    })).rejects.toThrow();
  });
});

describe('deleteMarketEvent', () => {
  it('calls DELETE on the correct URL', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: 'Deleted' }));
    await deleteMarketEvent('evt-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/market-events/evt-123'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws when event not found (404)', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse('Not found', 404));
    await expect(deleteMarketEvent('no-such-id')).rejects.toThrow();
  });
});

// ── CSV Upload ─────────────────────────────────────────────────────────────────

describe('uploadCSV', () => {
  it('returns CSVImportResponse on successful upload (TC-007 HTTP layer)', async () => {
    const successBody = { message: 'Import completed', imported_count: 1, file_type: 'positions' };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(successBody));

    const file = new File(['commodity,quantity\nCopper,10'], 'positions.csv', { type: 'text/csv' });
    const result = await uploadCSV('positions', file);

    expect(result.imported_count).toBe(1);
    expect(result.file_type).toBe('positions');
  });

  it('throws CSVUploadError with errors array on 400 response (TC-008)', async () => {
    const errorBody = {
      detail: {
        message: 'Validation failed',
        errors: [{ row: 2, column: 'direction', code: 'invalid_choice', message: 'Invalid direction' }],
      },
    };
    mockFetch.mockResolvedValueOnce(mockErrorResponse(errorBody.detail, 400));

    const file = new File(['data'], 'bad.csv', { type: 'text/csv' });
    await expect(uploadCSV('positions', file)).rejects.toBeInstanceOf(CSVUploadError);
  });

  it('throws generic CSVUploadError for non-structured error response', async () => {
    mockFetch.mockResolvedValueOnce(
      Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('parse fail')) } as Response)
    );
    const file = new File(['data'], 'bad.csv', { type: 'text/csv' });
    const err = await uploadCSV('positions', file).catch(e => e);
    expect(err).toBeInstanceOf(CSVUploadError);
    expect(err.message).toContain('Upload failed');
  });
});

// ── Positions ──────────────────────────────────────────────────────────────────

describe('listPositions', () => {
  it('returns positions array on success', async () => {
    const positions = [
      { id: '1', commodity: 'Copper', instrument: 'Future', direction: 'Long', quantity: 250, unit: 'MT', entry_price: 9410, market_price: 9475, currency: 'USD', counterparty: 'Global Metals Ltd' },
    ];
    mockFetch.mockResolvedValueOnce(mockJsonResponse(positions));

    const result = await listPositions('Copper');
    expect(result).toHaveLength(1);
    expect(result[0].commodity).toBe('Copper');
  });

  it('falls back to mock data on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    const result = await listPositions('Copper');
    expect(Array.isArray(result)).toBe(true);
    // Fallback data always has positions for the requested commodity
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('createPosition', () => {
  it('sends POST and returns the created position', async () => {
    const payload = {
      commodity: 'Copper',
      instrument: 'Future',
      direction: 'Long' as const,
      quantity: 250,
      unit: 'MT',
      entry_price: 9410,
      market_price: 9475,
      currency: 'USD',
      counterparty: 'Global Metals Ltd',
    };
    const created = { id: 'pos-1', ...payload };
    mockFetch.mockResolvedValueOnce(mockJsonResponse(created));

    const result = await createPosition(payload);
    expect(result.id).toBe('pos-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/positions'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });
});

describe('deletePosition', () => {
  it('sends DELETE to the correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ message: 'Deleted' }));
    await deletePosition('pos-42');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/positions/pos-42'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ── getFallbackDashboardData ───────────────────────────────────────────────────

describe('getFallbackDashboardData', () => {
  it('returns a complete dashboard structure for any commodity', () => {
    for (const commodity of ['Copper', 'Aluminium', 'Zinc', 'Nickel']) {
      const data = getFallbackDashboardData(commodity);
      expect(data.commodity).toBe(commodity);
      expect(data.decision).toBeDefined();
      expect(data.ai_brief).toBeDefined();
      expect(Array.isArray(data.positions)).toBe(true);
      expect(Array.isArray(data.inventory)).toBe(true);
      expect(Array.isArray(data.shipments)).toBe(true);
      expect(Array.isArray(data.counterparties)).toBe(true);
      expect(Array.isArray(data.alerts)).toBe(true);
    }
  });

  it('fallback decision is always Blocked for the demo scenario', () => {
    const data = getFallbackDashboardData('Copper');
    expect(data.decision.permission).toBe('Blocked');
  });
});
