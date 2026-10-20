import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Discover from '../pages/Discover';
import { renderWithProviders } from '../test/test-utils';
import api from '../services/api';

vi.mock('../services/api');

describe('Discover Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRecommendations = [
    {
      user_id: 10,
      name: 'Bob Ross',
      match_score: 95,
      reasons: ['Reciprocal Match'],
      teaches: ['Python', 'PostgreSQL'],
      wants: ['React'],
      average_rating: 4.9,
      ratings_count: 8
    },
    {
      user_id: 20,
      name: 'Leonardo Da Vinci',
      match_score: 80,
      reasons: ['Teaches wanted skill'],
      teaches: ['Figma', 'UI Design'],
      wants: ['Python'],
      average_rating: null,
      ratings_count: 0
    }
  ];

  it('renders recommendation cards with honest rating indicators', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockRecommendations });

    renderWithProviders(<Discover />);

    await waitFor(() => {
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
      expect(screen.getByText('Leonardo Da Vinci')).toBeInTheDocument();
    });

    // Bob has real rating
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(8 reviews)')).toBeInTheDocument();

    // Leonardo is unrated, should show New Peer
    expect(screen.getByText('New Peer')).toBeInTheDocument();
  });

  it('filters recommendations by search query text', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockRecommendations });

    renderWithProviders(<Discover />);

    await waitFor(() => {
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
      expect(screen.getByText('Leonardo Da Vinci')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by skill or peer name/i);
    fireEvent.change(searchInput, { target: { value: 'Figma' } });

    expect(screen.queryByText('Bob Ross')).not.toBeInTheDocument();
    expect(screen.getByText('Leonardo Da Vinci')).toBeInTheDocument();
  });

  it('filters recommendations by category selection', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockRecommendations });

    renderWithProviders(<Discover />);

    await waitFor(() => {
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
      expect(screen.getByText('Leonardo Da Vinci')).toBeInTheDocument();
    });

    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: 'Design' } });

    expect(screen.queryByText('Bob Ross')).not.toBeInTheDocument();
    expect(screen.getByText('Leonardo Da Vinci')).toBeInTheDocument();
  });

  it('sends match request when Connect button is clicked', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockRecommendations });
    (api.post as any).mockResolvedValueOnce({ data: { id: 1, status: 'PENDING' } });

    renderWithProviders(<Discover />);

    await waitFor(() => {
      expect(screen.getByText('Bob Ross')).toBeInTheDocument();
    });

    const matchButtons = screen.getAllByRole('button', { name: /Request Match/i });
    fireEvent.click(matchButtons[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/matches/10/request');
      expect(screen.getByText('Request Sent')).toBeInTheDocument();
    });
  });
});
