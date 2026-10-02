import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Plus, X } from 'lucide-react';

interface Skill {
  id: number;
  name: string;
  category: string;
}

export default function Skills() {
  const queryClient = useQueryClient();
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedType, setSelectedType] = useState<'TEACH' | 'LEARN'>('TEACH');
  const [error, setError] = useState('');

  // Fetch all available skills
  const { data: allSkills, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get('/skills');
      return res.data as Skill[];
    }
  });

  const { data: mySkills = [] } = useQuery({
    queryKey: ['my_skills'],
    queryFn: async () => {
      const res = await api.get('/skills/me');
      return res.data;
    }
  });

  const addSkillMutation = useMutation({
    mutationFn: async (skillId: number) => {
      return await api.post('/skills/me', {
        skill_id: skillId,
        type: selectedType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_skills'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to add skill');
    }
  });

  const createSkillMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/skills', { name, category: 'General' });
      return res.data;
    },
    onSuccess: (newSkill) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      addSkillMutation.mutate(newSkill.id);
      setNewSkillName('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create skill');
    }
  });

  const handleAddExisting = (skillId: number) => {
    addSkillMutation.mutate(skillId);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    
    // Check if it already exists
    const existing = allSkills?.find(s => s.name.toLowerCase() === newSkillName.toLowerCase());
    if (existing) {
      handleAddExisting(existing.id);
      setNewSkillName('');
    } else {
      createSkillMutation.mutate(newSkillName);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Skills</h1>
        <p className="text-slate-600 mt-2">Manage what you can teach and what you want to learn.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-indigo-500" />
          Add a Skill
        </h2>
        
        <form onSubmit={handleCreateNew} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="e.g. React, Python, UI/UX"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 border border-slate-300 rounded-lg outline-none bg-white"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'TEACH' | 'LEARN')}
          >
            <option value="TEACH">I can teach this</option>
            <option value="LEARN">I want to learn this</option>
          </select>
          <button 
            type="submit"
            disabled={addSkillMutation.isPending || createSkillMutation.isPending}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-500 mb-3">Or choose from available skills:</h3>
          <div className="flex flex-wrap gap-2">
            {skillsLoading ? (
              <span className="text-slate-400 text-sm">Loading skills...</span>
            ) : (
              allSkills?.slice(0, 15).map(skill => (
                <button
                  key={skill.id}
                  onClick={() => handleAddExisting(skill.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-sm rounded-full transition-colors border border-slate-200 hover:border-indigo-200"
                >
                  + {skill.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
            Skills I Can Teach
          </h2>
          <div className="space-y-3">
            {mySkills.filter((s: any) => s.type === 'TEACH').length === 0 ? (
              <p className="text-slate-500 text-sm italic">You haven't added any teaching skills yet.</p>
            ) : (
              mySkills.filter((s: any) => s.type === 'TEACH').map((skill: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">{skill.skill?.name || 'Unknown'}</span>
                  <button className="text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
            Skills I Want to Learn
          </h2>
          <div className="space-y-3">
            {mySkills.filter((s: any) => s.type === 'LEARN').length === 0 ? (
              <p className="text-slate-500 text-sm italic">You haven't added any learning skills yet.</p>
            ) : (
              mySkills.filter((s: any) => s.type === 'LEARN').map((skill: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">{skill.skill?.name || 'Unknown'}</span>
                  <button className="text-slate-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
