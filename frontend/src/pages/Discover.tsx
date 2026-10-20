import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { Star, ArrowRight, CheckCircle, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface Recommendation {
  user_id: number;
  name: string;
  profile_image?: string | null;
  match_score: number;
  reasons: string[];
  teaches: string[];
  wants: string[];
  average_rating?: number | null;
  ratings_count?: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Programming: ['python', 'javascript', 'typescript', 'react', 'node', 'coding', 'web', 'backend', 'frontend', 'sql', 'database', 'docker', 'git'],
  Design: ['design', 'ui', 'ux', 'figma', 'photoshop', 'illustrator', 'graphic', 'logo', 'animation', '3d'],
  Marketing: ['marketing', 'seo', 'content', 'growth', 'advertising', 'social', 'copywriting', 'email'],
  Languages: ['english', 'spanish', 'french', 'german', 'japanese', 'mandarin', 'korean', 'language', 'grammar'],
  Business: ['finance', 'management', 'accounting', 'sales', 'strategy', 'product', 'startup', 'leadership']
};

export default function Discover() {
  const [requestedMap, setRequestedMap] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const { data: recommendations, isLoading, isError, error, refetch } = useQuery<Recommendation[]>({
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

  const filteredMatches = useMemo(() => {
    if (!recommendations) return [];

    return recommendations.filter(match => {
      // 1. Text Search Filter (name, teaches, wants)
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query || (
        match.name.toLowerCase().includes(query) ||
        match.teaches.some(s => s.toLowerCase().includes(query)) ||
        match.wants.some(s => s.toLowerCase().includes(query))
      );

      if (!matchesQuery) return false;

      // 2. Category Filter
      if (selectedCategory === 'All Categories') return true;

      const keywords = CATEGORY_KEYWORDS[selectedCategory] || [selectedCategory.toLowerCase()];
      const allSkills = [...match.teaches, ...match.wants].map(s => s.toLowerCase());

      return allSkills.some(skill => 
        keywords.some(kw => skill.includes(kw))
      );
    });
  }, [recommendations, searchQuery, selectedCategory]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Discover Matches</h1>
        <p className="text-slate-600 mt-2">Find peers with complementary skills and start exchanging knowledge.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by skill or peer name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm text-slate-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
        >
          <option>All Categories</option>
          <option>Programming</option>
          <option>Design</option>
          <option>Marketing</option>
          <option>Languages</option>
          <option>Business</option>
        </select>
        {(searchQuery || selectedCategory !== 'All Categories') && (
          <button 
            onClick={() => { setSearchQuery(''); setSelectedCategory('All Categories'); }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap px-2"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-500 font-medium">Finding the best matches for you...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-rose-100 p-8">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Failed to load matches</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An error occurred while fetching recommendations.'}
          </p>
          <button 
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : recommendations?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No reciprocal matches found yet</h3>
          <p className="text-slate-500 max-w-md mx-auto mt-2 text-sm">
            Add more skills to your profile to increase your compatibility score with other learners and teachers.
          </p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No matches fit your filter</h3>
          <p className="text-slate-500 text-sm mt-1">Try searching for a different keyword or resetting your category filter.</p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedCategory('All Categories'); }}
            className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <div key={match.user_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                      {match.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{match.name}</h3>
                      <div className="flex items-center text-sm mt-0.5">
                        {match.average_rating ? (
                          <div className="flex items-center text-amber-500">
                            <Star className="w-4 h-4 fill-current mr-1" />
                            <span className="font-semibold text-slate-700">{match.average_rating.toFixed(1)}</span>
                            <span className="text-slate-400 text-xs ml-1">({match.ratings_count} {match.ratings_count === 1 ? 'review' : 'reviews'})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            New Peer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                    {Math.round(match.match_score)}% Match
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">They can teach</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {match.teaches.map((skill, i) => (
                        <span key={i} className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                      {match.teaches.length === 0 && <span className="text-xs text-slate-400 italic">None specified</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">They want to learn</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {match.wants.map((skill, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                      {match.wants.length === 0 && <span className="text-xs text-slate-400 italic">None specified</span>}
                    </div>
                  </div>
                </div>

                {match.reasons?.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <p className="font-semibold text-slate-700 mb-1">Why you match:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {match.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                {requestedMap[match.user_id] ? (
                  <button disabled className="w-full bg-emerald-50 text-emerald-600 font-medium py-2 rounded-lg flex items-center justify-center cursor-default text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Request Sent</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => requestMatchMutation.mutate(match.user_id)}
                    disabled={requestMatchMutation.isPending}
                    className="w-full bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50 text-sm shadow-sm"
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
