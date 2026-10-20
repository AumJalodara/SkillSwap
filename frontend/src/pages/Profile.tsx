import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Star, User as UserIcon, Calendar, Award, X, Edit3 } from 'lucide-react';

export default function Profile() {
  const { user, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    experience_level: '',
    availability: ''
  });
  const [editError, setEditError] = useState('');

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const res = await api.get('/auth/me');
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

  const { data: ratings = [] } = useQuery({
    queryKey: ['my_ratings'],
    queryFn: async () => {
      const res = await api.get('/ratings/me');
      return res.data;
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.patch('/users/me', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      checkAuth();
      setIsEditing(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.detail || 'Failed to update profile');
    }
  });

  const handleOpenEdit = () => {
    if (profileUser) {
      setFormData({
        name: profileUser.name || '',
        bio: profileUser.bio || '',
        experience_level: profileUser.experience_level || '',
        availability: profileUser.availability || ''
      });
    }
    setEditError('');
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setEditError('Name is required');
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const teachingSkills = skills.filter((s: any) => s.type === 'TEACH');
  const learningSkills = skills.filter((s: any) => s.type === 'LEARN');

  const avgRating = ratings.length > 0
    ? (ratings.reduce((acc: number, r: any) => acc + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  if (isLoading) return <div className="p-12 text-center text-slate-500">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-indigo-800"></div>
        <div className="px-8 pb-8 relative">
          <div className="w-24 h-24 bg-white rounded-full p-1 absolute -top-12 border-4 border-white shadow-sm flex items-center justify-center text-slate-300">
            <UserIcon className="w-12 h-12" />
          </div>
          
          <div className="mt-16 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-slate-900">{profileUser?.name}</h1>
                {avgRating && (
                  <span className="inline-flex items-center text-sm font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-current mr-1" />
                    {avgRating} ({ratings.length})
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-1">
                {profileUser?.email}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {profileUser?.experience_level && (
                  <span className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                    <Award className="w-3.5 h-3.5 mr-1" />
                    {profileUser.experience_level}
                  </span>
                )}
                {profileUser?.availability && (
                  <span className="inline-flex items-center text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {profileUser.availability}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={handleOpenEdit}
              className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="font-bold text-slate-900 mb-2">About</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">
              {profileUser?.bio || "This user hasn't written a bio yet."}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-amber-500" />
            Skills I can Teach
          </h2>
          {teachingSkills.length === 0 ? (
            <p className="text-slate-500 text-sm">No teaching skills added yet.</p>
          ) : (
            <div className="space-y-3">
              {teachingSkills.map((ts: any) => (
                <div key={ts.id} className="p-3 bg-amber-50 rounded-lg flex items-center justify-between border border-amber-100">
                  <span className="font-bold text-slate-900">{ts.skill.name}</span>
                  {ts.proficiency && (
                    <span className="text-xs font-medium text-amber-800 px-2 py-0.5 bg-amber-100 rounded-md">
                      Proficiency: {ts.proficiency}/5
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-emerald-500" />
            Skills I want to Learn
          </h2>
          {learningSkills.length === 0 ? (
            <p className="text-slate-500 text-sm">No learning skills added yet.</p>
          ) : (
            <div className="space-y-3">
              {learningSkills.map((ls: any) => (
                <div key={ls.id} className="p-3 bg-emerald-50 rounded-lg flex items-center justify-between border border-emerald-100">
                  <span className="font-bold text-slate-900">{ls.skill.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ratings & Reviews Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-amber-500 fill-current" />
          Peer Reviews & Ratings ({ratings.length})
        </h2>
        {ratings.length === 0 ? (
          <p className="text-slate-500 text-sm italic py-4">No reviews received yet. Complete sessions to earn ratings!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {ratings.map((r: any) => (
              <div key={r.id} className="py-4 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-4 h-4 ${star <= r.rating ? 'fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.review && <p className="text-sm text-slate-700">{r.review}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {editError}
                </div>
              )}

              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-bio" className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea
                  id="profile-bio"
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share a short bio about what you do..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="profile-experience" className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
                <select
                  id="profile-experience"
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  <option value="">Select level...</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label htmlFor="profile-availability" className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                <input
                  id="profile-availability"
                  type="text"
                  placeholder="e.g. Weekdays after 6pm, Weekends"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

