import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioOverviewHeatmap } from '../portfolio-overview-heatmap';
import { Position } from '@/types/domain';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <svg data-testid="trending-up" />,
  TrendingDown: () => <svg data-testid="trending-down" />,
  ShieldCheck: () => <svg data-testid="shield-check" />,
  Zap: () => <svg data-testid="zap" />,
  PieChart: () => <svg data-testid="pie-chart" />,
  Layers: () => <svg data-testid="layers" />,
  Sliders: () => <svg data-testid="sliders" />,
  Info: () => <svg data-testid="info" />,
}));

const samplePositions: Position[] = [
  {
    id: 'pos-1',
    commodity: 'Copper',
    instrument: 'LME Copper Grade A',
    direction: 'long',
    quantity: 5000,
    unit: 'MT',
    entry_price: 9200,
    market_price: 9600,
    counterparty: 'Glencore International',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'pos-2',
    commodity: 'Aluminium',
    instrument: 'LME Primary Aluminium',
    direction: 'short',
    quantity: 8000,
    unit: 'MT',
    entry_price: 2400,
    market_price: 2500,
    counterparty: 'Trafigura Trading',
    created_at: '2026-08-01T00:00:00Z',
  },
];

describe('PortfolioOverviewHeatmap Component', () => {
  it('renders loading state correctly', () => {
    render(<PortfolioOverviewHeatmap positions={[]} loading={true} />);
    expect(screen.getByText(/Calculating portfolio heatmaps/i)).toBeInTheDocument();
  });

  it('renders empty state when positions array is empty', () => {
    render(<PortfolioOverviewHeatmap positions={[]} loading={false} />);
    expect(screen.getByText(/No active positions to generate heatmap/i)).toBeInTheDocument();
  });

  it('renders portfolio summary metrics correctly', () => {
    render(<PortfolioOverviewHeatmap positions={samplePositions} loading={false} />);
    
    // Check metric labels
    expect(screen.getByText(/Gross Portfolio Value/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Exposure/i)).toBeInTheDocument();
    expect(screen.getByText(/Unrealized P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk Limit Status/i)).toBeInTheDocument();

    // Check commodity tiles
    expect(screen.getByText('Copper')).toBeInTheDocument();
    expect(screen.getByText('Aluminium')).toBeInTheDocument();
  });

  it('allows toggling heatmap color metric modes', () => {
    render(<PortfolioOverviewHeatmap positions={samplePositions} loading={false} />);

    const pnlValBtn = screen.getByRole('button', { name: 'P&L ($)' });
    const volumeBtn = screen.getByRole('button', { name: 'Volume' });

    fireEvent.click(pnlValBtn);
    expect(pnlValBtn).toHaveClass('bg-blue-600');

    fireEvent.click(volumeBtn);
    expect(volumeBtn).toHaveClass('bg-blue-600');
  });

  it('updates position inspector when a tile is clicked', () => {
    render(<PortfolioOverviewHeatmap positions={samplePositions} loading={false} />);

    const aluminiumTile = screen.getByText('Aluminium').closest('button');
    if (aluminiumTile) {
      fireEvent.click(aluminiumTile);
      expect(screen.getByText('LME Primary Aluminium')).toBeInTheDocument();
    }
  });
});
