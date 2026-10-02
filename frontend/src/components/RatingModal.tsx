import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Star, X } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  revieweeId: number;
  revieweeName: string;
}

export default function RatingModal({ isOpen, onClose, sessionId, revieweeId, revieweeName }: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: async () => {
      await api.post('/ratings', {
        session_id: sessionId,
        reviewee_id: revieweeId,
        rating,
        review
      });
    },
    onSuccess: () => {
      // Invalidate if we need to refresh profile ratings, etc.
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to submit rating');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rateMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Rate Session</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              How was your session with {revieweeName}?
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-2 transition-colors ${rating >= star ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Leave a review (optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none resize-none"
              rows={4}
              placeholder="What did you learn? How was their teaching/learning style?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rateMutation.isPending}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {rateMutation.isPending ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
