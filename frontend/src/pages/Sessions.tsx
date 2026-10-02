import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, Clock, Video, CheckCircle, XCircle, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RatingModal from '../components/RatingModal';

export default function Sessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingSession, setRatingSession] = useState<any>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data;
    }
  });

  const { data: acceptedMatches = [] } = useQuery({
    queryKey: ['accepted_matches'],
    queryFn: async () => {
      const res = await api.get('/matches/accepted');
      return res.data;
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { match_id: number, teacher_id: number, learner_id: number, skill_id: number }) => {
      const res = await api.post('/sessions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await api.patch(`/sessions/${sessionId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await api.patch(`/sessions/${sessionId}/complete`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] }); // Refresh credits in case
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await api.patch(`/sessions/${sessionId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading sessions...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Sessions</h1>
        <p className="text-slate-600 mt-2">Manage your upcoming and past skill exchanges.</p>
      </div>

      {acceptedMatches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-8">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100">
            <h2 className="text-lg font-bold text-emerald-800">Matches Ready for Session</h2>
          </div>
          <div className="divide-y divide-emerald-50">
            {acceptedMatches.map((match: any) => {
              const otherUser = match.user1_id === user?.id ? match.user2 : match.user1;
              return (
                <div key={match.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{otherUser.name}</h3>
                    <p className="text-sm text-slate-500">Match accepted! Start a learning session.</p>
                  </div>
                  <button 
                    onClick={() => {
                      // In a real app we'd open a modal to select the specific skill. 
                      // For MVP, we'll just send a dummy skill_id or assume the teacher/learner roles.
                      // Let's assume user1 is the teacher and user2 is the learner.
                      const teacherId = match.user1_id;
                      const learnerId = match.user2_id;
                      createSessionMutation.mutate({
                        match_id: match.id,
                        teacher_id: teacherId,
                        learner_id: learnerId,
                        skill_id: 1 // Dummy skill id for MVP flow, or we could look it up
                      });
                    }}
                    disabled={createSessionMutation.isPending}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Request Session
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {sessions?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p>You don't have any sessions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions?.map((session: any) => {
              const isTeacher = session.teacher_id === user?.id;
              const otherUser = isTeacher ? session.learner : session.teacher;
              
              return (
                <div key={session.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                      {otherUser?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${isTeacher ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isTeacher ? 'Teaching' : 'Learning'}
                        </span>
                        <span className="font-bold text-slate-900 text-lg">
                          {session.skill?.name}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        with <span className="font-medium text-slate-900">{otherUser?.name || 'Unknown'}</span>
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {session.duration_minutes} mins
                        </div>
                        {session.scheduled_at && (
                          <div className="flex items-center text-indigo-600 font-medium">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(session.scheduled_at).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center">
                          Status: <span className="ml-1 font-semibold text-slate-700">{session.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 md:shrink-0">
                    {session.status === 'REQUESTED' && session.teacher_id === user?.id && (
                      <button 
                        onClick={() => acceptMutation.mutate(session.id)}
                        disabled={acceptMutation.isPending}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept
                      </button>
                    )}
                    
                    {session.status === 'ACCEPTED' && (
                      <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                        Schedule
                      </button>
                    )}

                    {session.status === 'SCHEDULED' && (
                      <>
                        {session.meeting_link && (
                          <a href={session.meeting_link} target="_blank" rel="noreferrer" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center">
                            <Video className="w-4 h-4 mr-2" />
                            Join Call
                          </a>
                        )}
                        <button 
                          onClick={() => completeMutation.mutate(session.id)}
                          disabled={completeMutation.isPending}
                          className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete
                        </button>
                      </>
                    )}
                    
                    {session.status === 'COMPLETED' && (
                      <button 
                        onClick={() => {
                          setRatingSession(session);
                          setRatingModalOpen(true);
                        }}
                        className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-medium hover:bg-amber-200 transition-colors flex items-center justify-center border border-amber-200"
                      >
                        <Star className="w-4 h-4 mr-2 fill-current" />
                        Rate
                      </button>
                    )}
                    
                    {['REQUESTED', 'ACCEPTED', 'SCHEDULED'].includes(session.status) && (
                        <button 
                          onClick={() => cancelMutation.mutate(session.id)}
                          disabled={cancelMutation.isPending}
                          className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ratingSession && (
        <RatingModal 
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setRatingSession(null);
          }}
          sessionId={ratingSession.id}
          revieweeId={ratingSession.teacher_id === user?.id ? ratingSession.learner_id : ratingSession.teacher_id}
          revieweeName={ratingSession.teacher_id === user?.id ? ratingSession.learner?.name : ratingSession.teacher?.name}
        />
      )}
    </div>
  );
}
