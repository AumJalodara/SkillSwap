import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Bell, Check } from 'lucide-react';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000 // Poll every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Notifications</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
              {unreadCount} new
            </span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((n: any) => (
                  <div key={n.id} className={`p-4 flex items-start space-x-3 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/50' : ''}`}>
                    <div className="flex-1">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n.id);
                        }}
                        className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
