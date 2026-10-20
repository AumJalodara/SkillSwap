import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, Video, Clock, X } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: number;
    skill?: { name: string };
    scheduled_at?: string;
    meeting_link?: string;
    duration_minutes?: number;
  } | null;
}

export default function ScheduleModal({ isOpen, onClose, session }: ScheduleModalProps) {
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState(
    session?.scheduled_at ? new Date(session.scheduled_at).toISOString().slice(0, 16) : ''
  );
  const [meetingLink, setMeetingLink] = useState(session?.meeting_link || '');
  const [duration, setDuration] = useState<number>(session?.duration_minutes || 60);
  const [error, setError] = useState('');

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const payload: { scheduled_at?: string; meeting_link?: string; duration_minutes?: number } = {};
      if (scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }
      if (meetingLink.trim()) {
        payload.meeting_link = meetingLink.trim();
      }
      payload.duration_minutes = Number(duration);

      const res = await api.patch(`/sessions/${session?.id}/schedule`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to schedule session');
    }
  });

  if (!isOpen || !session) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      setError('Please select a date and time for the session');
      return;
    }
    scheduleMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Schedule Session</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Skill</span>
            <p className="text-base font-semibold text-slate-800 mt-0.5">
              {session.skill?.name || 'Selected Skill'}
            </p>
          </div>

          <div>
            <label htmlFor="scheduled-at" className="block text-sm font-medium text-slate-700 mb-1">
              Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="scheduled-at"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="session-duration" className="block text-sm font-medium text-slate-700 mb-1">
              Duration
            </label>
            <div className="relative">
              <select
                id="session-duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
                <option value={90}>90 minutes (1.5 hours)</option>
              </select>
              <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="meeting-link" className="block text-sm font-medium text-slate-700 mb-1">
              Video Call Link (Optional)
            </label>
            <div className="relative">
              <input
                id="meeting-link"
                type="url"
                placeholder="https://meet.google.com/xyz or Zoom link"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
              />
              <Video className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {scheduleMutation.isPending ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
