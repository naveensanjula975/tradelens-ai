import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PositionFormModal } from '../position-form-modal';
import * as apiClient from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  createPosition: jest.fn(),
  updatePosition: jest.fn(),
}));

describe('PositionFormModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Add Position title when existing position is null', () => {
    render(
      <PositionFormModal existing={null} defaultCommodity="Copper" onClose={mockOnClose} />
    );
    expect(screen.getByText('Add Position')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Position/i })).toBeInTheDocument();
  });

  it('renders Edit Position title when existing position is provided', () => {
    const existingPosition = {
      id: 'pos-123',
      commodity: 'Aluminium',
      instrument: 'LME Future',
      direction: 'Long',
      quantity: 100,
      unit: 'MT',
      entry_price: 2400,
      market_price: 2500,
      currency: 'USD',
      counterparty: 'Glencore Ltd',
    };

    render(
      <PositionFormModal existing={existingPosition} defaultCommodity="Copper" onClose={mockOnClose} />
    );

    expect(screen.getByText('Edit Position')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Position/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('LME Future')).toBeInTheDocument();
  });

  it('calls createPosition and onClose(true) on successful form submission', async () => {
    (apiClient.createPosition as jest.Mock).mockResolvedValueOnce({ id: 'pos-new' });

    render(
      <PositionFormModal existing={null} defaultCommodity="Zinc" onClose={mockOnClose} />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. LME Future'), {
      target: { value: 'Zinc Spot Contract' },
    });
    fireEvent.change(screen.getByPlaceholderText('MT'), {
      target: { value: 'MT' },
    });

    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '500' } }); // Quantity
    fireEvent.change(numberInputs[1], { target: { value: '2800' } }); // Entry Price
    fireEvent.change(numberInputs[2], { target: { value: '2900' } }); // Market Price

    fireEvent.click(screen.getByRole('button', { name: /Create Position/i }));

    await waitFor(() => {
      expect(apiClient.createPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          commodity: 'Zinc',
          instrument: 'Zinc Spot Contract',
          quantity: 500,
          entry_price: 2800,
          market_price: 2900,
        })
      );
      expect(mockOnClose).toHaveBeenCalledWith(true);
    });
  });

  it('displays error message when API call fails', async () => {
    (apiClient.createPosition as jest.Mock).mockRejectedValueOnce(new Error('Validation error'));

    render(
      <PositionFormModal existing={null} defaultCommodity="Copper" onClose={mockOnClose} />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. LME Future'), {
      target: { value: 'Copper Future' },
    });
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '100' } });
    fireEvent.change(numberInputs[1], { target: { value: '9000' } });
    fireEvent.change(numberInputs[2], { target: { value: '9200' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Position/i }));

    await waitFor(() => {
      expect(screen.getByText('Validation error')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalledWith(true);
    });
  });
});
