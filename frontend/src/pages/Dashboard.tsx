import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Star, Clock, Activity, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const res = await api.get('/credits/balance');
      return res.data.balance;
    }
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['my_skills'],
    queryFn: async () => {
      const res = await api.get('/skills/me');
      return res.data;
    }
  });

  // Since we haven't built all aggregate endpoints yet, we'll mock some dashboard stats 
  // based on the UI requirements while wiring up the available APIs
  
  const { data: pendingMatches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['pending_matches'],
    queryFn: async () => {
      const res = await api.get('/matches/pending');
      return res.data;
    }
  });

  const acceptMatchMutation = useMutation({
    mutationFn: async (matchId: number) => {
      const res = await api.patch(`/matches/${matchId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_matches'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  const teachingCount = skills.filter((s: any) => s.type === 'TEACH').length;
  const learningCount = skills.filter((s: any) => s.type === 'LEARN').length;

  const stats = [
    { label: 'Skill Credits', value: creditsLoading ? '...' : (credits ?? 0), icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Skills Teaching', value: skillsLoading ? '...' : teachingCount, icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Skills Learning', value: skillsLoading ? '...' : learningCount, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Pending Matches', value: matchesLoading ? '...' : pendingMatches.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user?.name} 👋</h1>
        <p className="text-slate-600 mt-2">Here is what's happening with your skill exchanges today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-500" />
              Upcoming Sessions
            </h2>
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Check your <Link to="/sessions" className="text-indigo-600 hover:underline">Sessions tab</Link> to manage them.
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-emerald-500" />
              Pending Match Requests
            </h2>
            <div className="space-y-4">
              {pendingMatches.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No pending match requests right now.
                </div>
              ) : (
                pendingMatches.map((match: any) => (
                  <div key={match.id} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-bold text-slate-900">{match.user1.name}</h3>
                      <p className="text-sm text-slate-500">Wants to match with you!</p>
                    </div>
                    <button 
                      onClick={() => acceptMatchMutation.mutate(match.id)}
                      disabled={acceptMatchMutation.isPending}
                      className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                    >
                      Accept Match
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Top Matches</h2>
              <Link to="/discover" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
              <p className="mb-4">Find students to match with!</p>
              <Link to="/discover" className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
                Discover Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
