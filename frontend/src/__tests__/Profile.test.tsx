import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../pages/Profile';
import { renderWithProviders } from '../test/test-utils';
import api from '../services/api';

vi.mock('../services/api');

const mockCheckAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Alice Test', email: 'alice@example.com', role: 'user' },
    isAuthenticated: true,
    isLoading: false,
    checkAuth: mockCheckAuth,
    logout: vi.fn(),
  }),
}));

describe('Profile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProfileUser = {
    id: 1,
    name: 'Alice Test',
    email: 'alice@example.com',
    bio: 'Software engineer building web apps.',
    experience_level: 'Advanced',
    availability: 'Evenings and weekends'
  };

  it('renders user profile details and skills', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: mockProfileUser });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      if (url === '/ratings/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Alice Test')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Software engineer building web apps.')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();
      expect(screen.getByText('Evenings and weekends')).toBeInTheDocument();
    });
  });

  it('opens edit modal and updates profile via PATCH /users/me', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: mockProfileUser });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      if (url === '/ratings/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    (api.patch as any).mockResolvedValueOnce({
      data: {
        ...mockProfileUser,
        name: 'Alice Updated',
        bio: 'Updated bio information'
      }
    });

    renderWithProviders(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Profile'));

    expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice Updated' } });

    const bioInput = screen.getByLabelText(/Bio/i);
    fireEvent.change(bioInput, { target: { value: 'Updated bio information' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/users/me', expect.objectContaining({
        name: 'Alice Updated',
        bio: 'Updated bio information'
      }));
      expect(mockCheckAuth).toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: 'Edit Profile' })).not.toBeInTheDocument();
    });
  });

  it('displays error message when PATCH /users/me fails', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve({ data: mockProfileUser });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      if (url === '/ratings/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    (api.patch as any).mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Bio must be at most 500 characters'
        }
      }
    });

    renderWithProviders(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Profile'));

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Bio must be at most 500 characters')).toBeInTheDocument();
    });
  });
});
