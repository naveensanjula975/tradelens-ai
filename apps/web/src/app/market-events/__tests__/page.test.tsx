/**
 * Tests for MarketEventsPage component (market-events/page.tsx)
 * Covers rendering, commodity filter, stats counters, form validation,
 * event creation, and event deletion flows.
 *
 * Relates to TC-016 (view mode), TC-020 (form modal), and TC-021 (CSV export)
 * style patterns applied to the market-events page.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Module mocks ───────────────────────────────────────────────────────────────

jest.mock('@/hooks/use-api', () => ({
  useMarketEvents: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  deleteMarketEvent: jest.fn(),
  createMarketEvent: jest.fn(),
}));

// Mock shared UI components to keep rendering simple
jest.mock('@/components/layout/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock('@/components/ui/shared', () => ({
  PageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  TableContainer: ({ children }: { children: React.ReactNode }) => <table data-testid="table-container">{children}</table>,
  Thead: ({ columns }: { columns: string[] }) => (
    <thead>
      <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
    </thead>
  ),
  LoadingRows: ({ cols }: { cols: number }) => (
    <tbody><tr><td colSpan={cols} data-testid="loading-rows">Loading…</td></tr></tbody>
  ),
  EmptyRow: ({ message, cols }: { message: string; cols: number }) => (
    <tbody><tr><td colSpan={cols} data-testid="empty-row">{message}</td></tr></tbody>
  ),
  ActionButton: ({ children, onClick, disabled, type, variant }: any) => (
    <button onClick={onClick} disabled={disabled} type={type ?? 'button'} data-variant={variant}>
      {children}
    </button>
  ),
  CommodityFilter: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="commodity-filter" value={value} onChange={e => onChange(e.target.value)}>
      {['Copper', 'Aluminium', 'Zinc', 'Nickel'].map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  ),
  StatusBadge: ({ label }: { label: string }) => <span data-testid="status-badge">{label}</span>,
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Zap: () => <span data-testid="icon-zap" />,
  TrendingUp: () => <span data-testid="icon-trending-up" />,
  TrendingDown: () => <span data-testid="icon-trending-down" />,
  Minus: () => <span data-testid="icon-minus" />,
  X: () => <span data-testid="icon-x" />,
}));

// ── Imports after mocks ────────────────────────────────────────────────────────

import MarketEventsPage from '@/app/market-events/page';
import { useMarketEvents } from '@/hooks/use-api';
import { deleteMarketEvent, createMarketEvent } from '@/lib/api-client';

const mockUseMarketEvents = useMarketEvents as jest.MockedFunction<typeof useMarketEvents>;
const mockDeleteMarketEvent = deleteMarketEvent as jest.MockedFunction<typeof deleteMarketEvent>;
const mockCreateMarketEvent = createMarketEvent as jest.MockedFunction<typeof createMarketEvent>;

// ── Helpers ────────────────────────────────────────────────────────────────────

const SAMPLE_EVENTS = [
  {
    id: 'evt-1',
    commodity: 'Copper',
    title: 'Chilean Port Strike',
    impact_level: 'High',
    description: 'Port workers halted copper exports.',
    source: 'Reuters',
    date: '2026-07-28',
  },
  {
    id: 'evt-2',
    commodity: 'Copper',
    title: 'LME Inventory Build',
    impact_level: 'Medium',
    description: 'LME registered warehouses see 3% inventory build.',
    source: 'Bloomberg',
    date: '2026-07-29',
  },
];

function mockHook(overrides: Partial<ReturnType<typeof useMarketEvents>> = {}) {
  mockUseMarketEvents.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  } as any);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MarketEventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress window.confirm and window.alert in tests
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  describe('Initial Rendering', () => {
    it('renders the page title', () => {
      mockHook();
      render(<MarketEventsPage />);
      expect(screen.getByText('Market Events')).toBeInTheDocument();
    });

    it('shows loading state while data is being fetched', () => {
      mockHook({ loading: true });
      render(<MarketEventsPage />);
      expect(screen.getByTestId('loading-rows')).toBeInTheDocument();
    });

    it('shows empty state message when no events exist', () => {
      mockHook({ data: [] });
      render(<MarketEventsPage />);
      expect(screen.getByTestId('empty-row')).toBeInTheDocument();
      expect(screen.getByTestId('empty-row')).toHaveTextContent("Log Event");
    });

    it('renders event rows when data is available', () => {
      mockHook({ data: SAMPLE_EVENTS });
      render(<MarketEventsPage />);
      expect(screen.getByText('Chilean Port Strike')).toBeInTheDocument();
      expect(screen.getByText('LME Inventory Build')).toBeInTheDocument();
    });

    it('renders commodity filter defaulted to Copper', () => {
      mockHook();
      render(<MarketEventsPage />);
      const filter = screen.getByTestId('commodity-filter') as HTMLSelectElement;
      expect(filter.value).toBe('Copper');
    });
  });

  // ── Stats Counter ─────────────────────────────────────────────────────────────

  describe('Stats Counters', () => {
    it('shows correct total event count', () => {
      mockHook({ data: SAMPLE_EVENTS });
      render(<MarketEventsPage />);
      expect(screen.getByText('Total Events').nextElementSibling?.textContent).toBe('2');
    });

    it('counts high-impact events correctly', () => {
      mockHook({ data: SAMPLE_EVENTS });
      render(<MarketEventsPage />);
      expect(screen.getByText('High Impact').nextElementSibling?.textContent).toBe('1');
    });

    it('counts medium-impact events correctly', () => {
      mockHook({ data: SAMPLE_EVENTS });
      render(<MarketEventsPage />);
      expect(screen.getByText('Medium Impact').nextElementSibling?.textContent).toBe('1');
    });

    it('shows zero counts on empty dataset', () => {
      mockHook({ data: [] });
      render(<MarketEventsPage />);
      expect(screen.getByText('Total Events').nextElementSibling?.textContent).toBe('0');
    });
  });

  // ── Log Event Modal ────────────────────────────────────────────────────────────

  describe('Log Event Modal — TC-020 pattern', () => {
    it('opens the form modal when "Log Event" button is clicked', async () => {
      mockHook();
      render(<MarketEventsPage />);
      const logBtn = screen.getByText(/Log Event/i, { selector: 'button' });
      await userEvent.click(logBtn);
      expect(screen.getByText('Log Market Event')).toBeInTheDocument();
    });

    it('closes the modal when the X button is clicked', async () => {
      mockHook();
      render(<MarketEventsPage />);
      await userEvent.click(screen.getByText(/Log Event/i, { selector: 'button' }));
      expect(screen.getByText('Log Market Event')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('icon-x').closest('button')!);
      expect(screen.queryByText('Log Market Event')).not.toBeInTheDocument();
    });

    it('closes the modal when Cancel is clicked', async () => {
      mockHook();
      render(<MarketEventsPage />);
      await userEvent.click(screen.getByText(/Log Event/i, { selector: 'button' }));
      await userEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Log Market Event')).not.toBeInTheDocument();
    });

    it('shows a validation error when required fields are empty', async () => {
      mockHook();
      render(<MarketEventsPage />);
      await userEvent.click(screen.getByText(/Log Event/i, { selector: 'button' }));
      // Submit without filling title/description/source
      const submitBtn = screen.getByText(/^Log Event$/i, { selector: 'button[type="submit"]' });
      await userEvent.click(submitBtn);
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });

    it('calls createMarketEvent and closes modal on valid submission', async () => {
      const mockRefresh = jest.fn();
      mockHook({ refresh: mockRefresh });
      mockCreateMarketEvent.mockResolvedValueOnce({
        id: 'new-evt',
        commodity: 'Copper',
        title: 'New Event',
        impact_level: 'Low',
        description: 'A new market event.',
        source: 'Reuters',
        date: '2026-08-01',
      });

      render(<MarketEventsPage />);
      await userEvent.click(screen.getByText(/Log Event/i, { selector: 'button' }));

      await userEvent.type(screen.getByPlaceholderText(/Chilean Port Strike/i), 'New Event');
      await userEvent.type(screen.getByPlaceholderText(/Describe the event/i), 'A new market event.');
      await userEvent.type(screen.getByPlaceholderText(/Reuters/i), 'Reuters');

      const submitBtn = screen.getByText(/^Log Event$/i, { selector: 'button[type="submit"]' });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateMarketEvent).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows an error message when createMarketEvent fails', async () => {
      mockHook();
      mockCreateMarketEvent.mockRejectedValueOnce(new Error('API error'));

      render(<MarketEventsPage />);
      await userEvent.click(screen.getByText(/Log Event/i, { selector: 'button' }));

      await userEvent.type(screen.getByPlaceholderText(/Chilean Port Strike/i), 'Fail Event');
      await userEvent.type(screen.getByPlaceholderText(/Describe the event/i), 'Description here.');
      await userEvent.type(screen.getByPlaceholderText(/Reuters/i), 'Bloomberg');

      const submitBtn = screen.getByText(/^Log Event$/i, { selector: 'button[type="submit"]' });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/i)).toBeInTheDocument();
      });
    });
  });

  // ── Delete Event ──────────────────────────────────────────────────────────────

  describe('Delete Market Event', () => {
    it('calls deleteMarketEvent and refreshes on confirmation', async () => {
      const mockRefresh = jest.fn();
      mockHook({ data: SAMPLE_EVENTS, refresh: mockRefresh });
      mockDeleteMarketEvent.mockResolvedValueOnce(undefined);

      render(<MarketEventsPage />);

      const deleteButtons = screen.getAllByTestId('icon-trash');
      await userEvent.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(mockDeleteMarketEvent).toHaveBeenCalledWith('evt-1');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('does NOT call deleteMarketEvent when confirm is cancelled', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      mockHook({ data: SAMPLE_EVENTS });

      render(<MarketEventsPage />);
      const deleteButtons = screen.getAllByTestId('icon-trash');
      await userEvent.click(deleteButtons[0].closest('button')!);

      expect(mockDeleteMarketEvent).not.toHaveBeenCalled();
    });

    it('shows alert when deleteMarketEvent throws', async () => {
      const alertSpy = jest.spyOn(window, 'alert');
      mockHook({ data: SAMPLE_EVENTS, refresh: jest.fn() });
      mockDeleteMarketEvent.mockRejectedValueOnce(new Error('Network error'));

      render(<MarketEventsPage />);
      const deleteButtons = screen.getAllByTestId('icon-trash');
      await userEvent.click(deleteButtons[0].closest('button')!);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete event.');
      });
    });
  });

  // ── Commodity Filter ──────────────────────────────────────────────────────────

  describe('Commodity Filter', () => {
    it('refreshes events when commodity changes', async () => {
      mockHook();
      render(<MarketEventsPage />);
      const filter = screen.getByTestId('commodity-filter');
      fireEvent.change(filter, { target: { value: 'Aluminium' } });
      // useMarketEvents should have been called with the new value
      expect(mockUseMarketEvents).toHaveBeenCalledWith('Aluminium');
    });
  });
});
