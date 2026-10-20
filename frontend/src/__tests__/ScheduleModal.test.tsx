import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduleModal from '../components/ScheduleModal';
import { renderWithProviders } from '../test/test-utils';
import api from '../services/api';

vi.mock('../services/api');

describe('ScheduleModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = {
    id: 101,
    skill: { name: 'Fullstack React' },
    scheduled_at: '',
    meeting_link: '',
    duration_minutes: 60
  };

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <ScheduleModal isOpen={false} onClose={vi.fn()} session={mockSession} />
    );
    expect(screen.queryByText('Schedule Session')).not.toBeInTheDocument();
  });

  it('renders modal with session skill and form fields when isOpen is true', () => {
    renderWithProviders(
      <ScheduleModal isOpen={true} onClose={vi.fn()} session={mockSession} />
    );

    expect(screen.getByText('Schedule Session')).toBeInTheDocument();
    expect(screen.getByText('Fullstack React')).toBeInTheDocument();
    expect(screen.getByLabelText(/Date & Time/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/meet\.google\.com/i)).toBeInTheDocument();
  });

  it('submits scheduling payload to /sessions/:id/schedule and closes modal on success', async () => {
    const handleClose = vi.fn();
    (api.patch as any).mockResolvedValueOnce({
      data: {
        id: 101,
        status: 'SCHEDULED',
        scheduled_at: '2026-10-25T14:00:00.000Z',
        meeting_link: 'https://meet.google.com/abc-xyz'
      }
    });

    renderWithProviders(
      <ScheduleModal isOpen={true} onClose={handleClose} session={mockSession} />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    fireEvent.change(dateInput, { target: { value: '2026-10-25T14:00' } });

    const linkInput = screen.getByPlaceholderText(/meet\.google\.com/i);
    fireEvent.change(linkInput, { target: { value: 'https://meet.google.com/abc-xyz' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/sessions/101/schedule', expect.objectContaining({
        meeting_link: 'https://meet.google.com/abc-xyz',
        duration_minutes: 60
      }));
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays API error message when scheduling fails', async () => {
    (api.patch as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Session must be in ACCEPTED state to schedule'
        }
      }
    });

    renderWithProviders(
      <ScheduleModal isOpen={true} onClose={vi.fn()} session={mockSession} />
    );

    const dateInput = screen.getByLabelText(/Date & Time/i);
    fireEvent.change(dateInput, { target: { value: '2026-10-25T14:00' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Session must be in ACCEPTED state to schedule')).toBeInTheDocument();
    });
  });
});
