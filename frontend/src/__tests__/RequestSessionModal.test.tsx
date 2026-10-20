import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import RequestSessionModal from '../components/RequestSessionModal';
import { renderWithProviders } from '../test/test-utils';
import api from '../services/api';

vi.mock('../services/api');

describe('RequestSessionModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMatch = {
    id: 42,
    user1_id: 1,
    user2_id: 2,
    user1: { id: 1, name: 'Alice' },
    user2: { id: 2, name: 'Bob' }
  };

  const mockSkills = [
    { id: 10, name: 'Python', category: 'Programming' },
    { id: 20, name: 'React', category: 'Programming' }
  ];

  it('renders modal with partner details and skill dropdown', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockSkills });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(
      <RequestSessionModal
        isOpen={true}
        onClose={vi.fn()}
        match={mockMatch}
        currentUserId={1}
      />
    );

    expect(screen.getByText('Request Session')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Python (Programming)')).toBeInTheDocument();
      expect(screen.getByText('React (Programming)')).toBeInTheDocument();
    });
  });

  it('creates a session request on valid form submission', async () => {
    const handleClose = vi.fn();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockSkills });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    (api.post as any).mockResolvedValueOnce({
      data: {
        id: 99,
        match_id: 42,
        teacher_id: 2,
        learner_id: 1,
        skill_id: 20,
        status: 'REQUESTED'
      }
    });

    renderWithProviders(
      <RequestSessionModal
        isOpen={true}
        onClose={handleClose}
        match={mockMatch}
        currentUserId={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('React (Programming)')).toBeInTheDocument();
    });

    // Select skill
    const skillSelect = screen.getByLabelText(/Select Skill/i);
    fireEvent.change(skillSelect, { target: { value: '20' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Send Session Request/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/sessions', expect.objectContaining({
        match_id: 42,
        teacher_id: 2,
        learner_id: 1,
        skill_id: 20,
        duration_minutes: 60
      }));
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('disables submit button if no skill is selected', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockSkills });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(
      <RequestSessionModal
        isOpen={true}
        onClose={vi.fn()}
        match={mockMatch}
        currentUserId={1}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Send Session Request/i });
    expect(submitBtn).toBeDisabled();
  });
});
