import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Plus, X, Sparkles, Loader2, Check } from 'lucide-react';

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

  // AI Extraction State
  const [aiText, setAiText] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ teaching: string[]; learning: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [addedAiSkills, setAddedAiSkills] = useState<Record<string, boolean>>({});

  // Fetch all available skills
  const { data: allSkills = [], isLoading: skillsLoading } = useQuery({
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
    mutationFn: async ({ skillId, type }: { skillId: number; type: 'TEACH' | 'LEARN' }) => {
      return await api.post('/skills/me', {
        skill_id: skillId,
        type: type,
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

  const deleteSkillMutation = useMutation({
    mutationFn: async (userSkillId: number) => {
      const res = await api.delete(`/skills/me/${userSkillId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_skills'] });
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to remove skill');
    }
  });

  const createSkillMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: 'TEACH' | 'LEARN' }) => {
      const res = await api.post('/skills', { name, category: 'General' });
      return { skill: res.data, type };
    },
    onSuccess: ({ skill, type }) => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      addSkillMutation.mutate({ skillId: skill.id, type });
      setNewSkillName('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create skill');
    }
  });

  const handleAddExisting = (skillId: number, type: 'TEACH' | 'LEARN' = selectedType) => {
    addSkillMutation.mutate({ skillId, type });
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    
    // Check if it already exists
    const existing = allSkills?.find(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase());
    if (existing) {
      handleAddExisting(existing.id, selectedType);
      setNewSkillName('');
    } else {
      createSkillMutation.mutate({ name: newSkillName.trim(), type: selectedType });
    }
  };

  const handleExtractAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.post('/skills/extract', { text: aiText.trim() });
      setAiSuggestions(res.data);
    } catch (err: any) {
      setAiError(err.response?.data?.detail || 'AI skill extraction is temporarily unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiSkill = (name: string, type: 'TEACH' | 'LEARN') => {
    const existing = allSkills.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addSkillMutation.mutate({ skillId: existing.id, type });
    } else {
      createSkillMutation.mutate({ name, type });
    }
    setAddedAiSkills(prev => ({ ...prev, [`${type}_${name}`]: true }));
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

      {/* AI Skill Extractor Box */}
      <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 p-6 rounded-2xl border border-indigo-100/80 shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">AI Skill Assistant</h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Groq AI</span>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Describe your background, what you enjoy doing, or what you hope to learn. Our AI will automatically parse skills for your profile.
        </p>

        <form onSubmit={handleExtractAi} className="space-y-3">
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={2}
            placeholder="e.g. I have 3 years of experience in Python and PostgreSQL. I really want to learn UI/UX design and React."
            className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none resize-none bg-white"
          />
          <div className="flex justify-between items-center">
            {aiError && <span className="text-xs text-rose-500 font-medium">{aiError}</span>}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={aiLoading || !aiText.trim()}
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Skills</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {aiSuggestions && (
          <div className="mt-5 pt-4 border-t border-indigo-100 space-y-4">
            {aiSuggestions.teaching?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                  Suggested to Teach:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.teaching.map((skillName, idx) => {
                    const isAdded = addedAiSkills[`TEACH_${skillName}`];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddAiSkill(skillName, 'TEACH')}
                        disabled={isAdded}
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                            : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 shadow-sm'
                        }`}
                      >
                        {isAdded ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                        <span>{skillName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {aiSuggestions.learning?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  Suggested to Learn:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.learning.map((skillName, idx) => {
                    const isAdded = addedAiSkills[`LEARN_${skillName}`];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddAiSkill(skillName, 'LEARN')}
                        disabled={isAdded}
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                            : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-sm'
                        }`}
                      >
                        {isAdded ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                        <span>{skillName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {aiSuggestions.teaching?.length === 0 && aiSuggestions.learning?.length === 0 && (
              <p className="text-xs text-slate-500 italic">No skills could be identified. Try being more specific about technologies or topics.</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-indigo-500" />
          Add a Skill Manually
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
          <h3 className="text-sm font-medium text-slate-500 mb-3">Or choose from popular skills:</h3>
          <div className="flex flex-wrap gap-2">
            {skillsLoading ? (
              <span className="text-slate-400 text-sm">Loading skills...</span>
            ) : (
              allSkills?.slice(0, 15).map(skill => (
                <button
                  key={skill.id}
                  onClick={() => handleAddExisting(skill.id, selectedType)}
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
              mySkills.filter((s: any) => s.type === 'TEACH').map((skill: any) => (
                <div key={skill.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">{skill.skill?.name || 'Unknown'}</span>
                  <button 
                    onClick={() => deleteSkillMutation.mutate(skill.id)}
                    disabled={deleteSkillMutation.isPending}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Remove skill"
                  >
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
              mySkills.filter((s: any) => s.type === 'LEARN').map((skill: any) => (
                <div key={skill.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">{skill.skill?.name || 'Unknown'}</span>
                  <button 
                    onClick={() => deleteSkillMutation.mutate(skill.id)}
                    disabled={deleteSkillMutation.isPending}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Remove skill"
                  >
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

