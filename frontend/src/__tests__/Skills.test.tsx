import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Skills from '../pages/Skills';
import { renderWithProviders } from '../test/test-utils';
import api from '../services/api';

vi.mock('../services/api');

describe('Skills Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAvailableSkills = [
    { id: 1, name: 'Python', category: 'Programming' },
    { id: 2, name: 'React', category: 'Programming' },
  ];

  const mockMySkills = [
    {
      id: 101,
      skill_id: 1,
      type: 'TEACH',
      proficiency: 5,
      skill: { id: 1, name: 'Python', category: 'Programming' }
    },
    {
      id: 102,
      skill_id: 2,
      type: 'LEARN',
      skill: { id: 2, name: 'React', category: 'Programming' }
    }
  ];

  it('renders teaching and learning skills', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockAvailableSkills });
      if (url === '/skills/me') return Promise.resolve({ data: mockMySkills });
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<Skills />);

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    expect(screen.getByText('Skills I Can Teach')).toBeInTheDocument();
    expect(screen.getByText('Skills I Want to Learn')).toBeInTheDocument();
  });

  it('deletes a user skill when remove button is clicked', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockAvailableSkills });
      if (url === '/skills/me') return Promise.resolve({ data: mockMySkills });
      return Promise.resolve({ data: [] });
    });

    (api.delete as any).mockResolvedValueOnce({ data: { message: 'Skill deleted' } });

    renderWithProviders(<Skills />);

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle('Remove skill');
    expect(removeButtons.length).toBe(2);

    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/skills/me/101');
    });
  });

  it('extracts skills via AI Assistant and suggests additions', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/skills') return Promise.resolve({ data: mockAvailableSkills });
      if (url === '/skills/me') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    (api.post as any).mockImplementation((url: string) => {
      if (url === '/skills/extract') {
        return Promise.resolve({
          data: {
            teaching: ['Docker', 'FastAPI'],
            learning: ['TypeScript']
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<Skills />);

    const textarea = screen.getByPlaceholderText(/e\.g\. I have 3 years of experience/i);
    fireEvent.change(textarea, { target: { value: 'I build microservices with Docker and FastAPI.' } });

    const extractBtn = screen.getByRole('button', { name: /Extract Skills/i });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/skills/extract', {
        text: 'I build microservices with Docker and FastAPI.'
      });
      expect(screen.getByText('Suggested to Teach:')).toBeInTheDocument();
      expect(screen.getByText('Docker')).toBeInTheDocument();
      expect(screen.getByText('FastAPI')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });
});
