import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Star, ArrowRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function Discover() {
  const [requestedMap, setRequestedMap] = useState<Record<number, boolean>>({});

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get('/matches/recommendations');
      return res.data;
    }
  });

  const requestMatchMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.post(`/matches/${userId}/request`);
      return { userId, data: res.data };
    },
    onSuccess: ({ userId }) => {
      setRequestedMap(prev => ({ ...prev, [userId]: true }));
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Discover Matches</h1>
        <p className="text-slate-600 mt-2">Find students with complementary skills and start exchanging knowledge.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <input 
          type="text" 
          placeholder="Search by skill, name, or category..."
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
        />
        <select className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white">
          <option>All Categories</option>
          <option>Programming</option>
          <option>Design</option>
          <option>Marketing</option>
        </select>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Search
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-500">Finding the best matches for you...</p>
        </div>
      ) : recommendations?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No matches found</h3>
          <p className="text-slate-500 max-w-md mx-auto mt-2">
            Try adding more skills to your profile to increase your chances of finding a reciprocal match.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations?.map((match: any) => (
            <div key={match.user_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                      {match.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{match.name}</h3>
                      <div className="flex items-center text-sm text-amber-500">
                        <Star className="w-4 h-4 fill-current mr-1" />
                        <span>4.8 (new)</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-100">
                    {Math.round(match.match_score)}% Match
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">They can teach</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.teaches.map((skill: str, i: number) => (
                        <span key={i} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">{skill}</span>
                      ))}
                      {match.teaches.length === 0 && <span className="text-sm text-slate-400">None specified</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">They want to learn</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.wants.map((skill: str, i: number) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm">{skill}</span>
                      ))}
                      {match.wants.length === 0 && <span className="text-sm text-slate-400">None specified</span>}
                    </div>
                  </div>
                </div>

                {match.reasons?.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">
                    <p className="font-medium text-slate-700 mb-1">Why it's a match:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {match.reasons.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-3">
                <button className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  View Profile
                </button>
                {requestedMap[match.user_id] ? (
                  <button disabled className="flex-1 bg-green-50 text-green-600 font-medium py-2 rounded-lg flex items-center justify-center cursor-default">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Requested</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => requestMatchMutation.mutate(match.user_id)}
                    disabled={requestMatchMutation.isPending}
                    className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <span>Request Match</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
