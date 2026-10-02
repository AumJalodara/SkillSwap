import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Star, User as UserIcon } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  
  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const res = await api.get('/auth/me'); // Or /users/{id} for public profiles if implemented
      return res.data;
    },
    enabled: !!user
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['my_skills'],
    queryFn: async () => {
      const res = await api.get('/skills/me');
      return res.data;
    }
  });

  const teachingSkills = skills.filter((s: any) => s.type === 'TEACH');
  const learningSkills = skills.filter((s: any) => s.type === 'LEARN');

  if (isLoading) return <div className="p-12 text-center text-slate-500">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-32 bg-indigo-600"></div>
        <div className="px-8 pb-8 relative">
          <div className="w-24 h-24 bg-white rounded-full p-1 absolute -top-12 border-4 border-white shadow-sm flex items-center justify-center text-slate-300">
            <UserIcon className="w-12 h-12" />
          </div>
          
          <div className="mt-16 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{profileUser?.name}</h1>
              <p className="text-slate-500 mt-1 flex items-center">
                {profileUser?.email}
              </p>
            </div>
            <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors">
              Edit Profile
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="font-bold text-slate-900 mb-2">About</h3>
            <p className="text-slate-600 leading-relaxed">
              {profileUser?.bio || "This user hasn't written a bio yet."}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-amber-500" />
            Skills they can Teach
          </h2>
          {teachingSkills.length === 0 ? (
            <p className="text-slate-500">No skills added.</p>
          ) : (
            <div className="space-y-3">
              {teachingSkills.map((ts: any) => (
                <div key={ts.id} className="p-3 bg-amber-50 rounded-lg flex items-center justify-between">
                  <span className="font-bold text-slate-900">{ts.skill.name}</span>
                  <span className="text-sm font-medium text-amber-700 px-2 py-1 bg-amber-100 rounded-md">
                    Proficiency: {ts.proficiency}/5
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-emerald-500" />
            Skills they want to Learn
          </h2>
          {learningSkills.length === 0 ? (
            <p className="text-slate-500">No skills added.</p>
          ) : (
            <div className="space-y-3">
              {learningSkills.map((ls: any) => (
                <div key={ls.id} className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between">
                  <span className="font-bold text-slate-900">{ls.skill.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
