import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { BookOpen, Clock, X, AlertCircle } from 'lucide-react';

interface RequestSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    id: number;
    user1_id: number;
    user2_id: number;
    user1?: { id: number; name: string };
    user2?: { id: number; name: string };
  } | null;
  currentUserId?: number;
}

export default function RequestSessionModal({
  isOpen,
  onClose,
  match,
  currentUserId
}: RequestSessionModalProps) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<'LEARN' | 'TEACH'>('LEARN');
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>('');
  const [duration, setDuration] = useState<number>(60);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');

  // Fetch all skills for dropdown
  const { data: allSkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get('/skills');
      return res.data;
    },
    enabled: isOpen
  });

  // Fetch current user skills for teaching options
  const { data: mySkills = [] } = useQuery({
    queryKey: ['my_skills'],
    queryFn: async () => {
      const res = await api.get('/skills/me');
      return res.data;
    },
    enabled: isOpen
  });

  const otherUser = match?.user1_id === currentUserId ? match?.user2 : match?.user1;
  const otherUserId = match?.user1_id === currentUserId ? match?.user2_id : match?.user1_id;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSkillId) {
        throw new Error('Please select a skill for this session');
      }
      if (!match || !otherUserId || !currentUserId) {
        throw new Error('Match participant information missing');
      }

      const teacherId = role === 'LEARN' ? otherUserId : currentUserId;
      const learnerId = role === 'LEARN' ? currentUserId : otherUserId;

      const payload: any = {
        match_id: match.id,
        teacher_id: teacherId,
        learner_id: learnerId,
        skill_id: Number(selectedSkillId),
        duration_minutes: duration
      };

      if (scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }

      const res = await api.post('/sessions', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || err.message || 'Failed to request session');
    }
  });

  if (!isOpen || !match) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) {
      setError('Please select a skill');
      return;
    }
    createMutation.mutate();
  };

  // If role is TEACH, filter to skills current user can teach
  const myTeachingSkillIds = mySkills
    .filter((s: any) => s.type === 'TEACH')
    .map((s: any) => s.skill_id);

  const displaySkills = role === 'TEACH'
    ? allSkills.filter((s: any) => myTeachingSkillIds.includes(s.id))
    : allSkills;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Request Session</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Peer Partner
            </label>
            <div className="p-3 bg-slate-50 rounded-lg font-semibold text-slate-800">
              {otherUser?.name || 'Peer Student'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What role would you like in this session?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRole('LEARN');
                  setSelectedSkillId('');
                }}
                className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                  role === 'LEARN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                I want to Learn (1 Credit)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('TEACH');
                  setSelectedSkillId('');
                }}
                className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                  role === 'TEACH'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                I want to Teach (Earn 1)
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="request-skill-select" className="block text-sm font-medium text-slate-700 mb-1">
              Select Skill <span className="text-rose-500">*</span>
            </label>
            {skillsLoading ? (
              <p className="text-sm text-slate-400">Loading skills...</p>
            ) : (
              <select
                id="request-skill-select"
                required
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">-- Choose a skill --</option>
                {displaySkills.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'General'})
                  </option>
                ))}
              </select>
            )}
            {role === 'TEACH' && displaySkills.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                You haven't added any teaching skills to your profile yet. Add them in the "My Skills" tab first.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="request-duration-select" className="block text-sm font-medium text-slate-700 mb-1">
              Duration
            </label>
            <div className="relative">
              <select
                id="request-duration-select"
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
            <label htmlFor="request-datetime" className="block text-sm font-medium text-slate-700 mb-1">
              Proposed Date & Time (Optional)
            </label>
            <input
              id="request-datetime"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
            />
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
              disabled={createMutation.isPending || !selectedSkillId}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Sending Request...' : 'Send Session Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
