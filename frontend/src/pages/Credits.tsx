import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Coins, ArrowDownRight, ArrowUpRight, Gift } from 'lucide-react';

export default function Credits() {
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits_balance'],
    queryFn: async () => {
      const res = await api.get('/credits/balance');
      return res.data.balance;
    }
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['credits_transactions'],
    queryFn: async () => {
      const res = await api.get('/credits/transactions');
      return res.data;
    }
  });

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'SIGNUP_BONUS') return <Gift className="w-5 h-5 text-purple-500" />;
    if (amount > 0) return <ArrowDownRight className="w-5 h-5 text-emerald-500" />;
    return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Skill Credits</h1>
        <p className="text-slate-600 mt-2">Manage your credits. Earn credits by teaching, spend them to learn.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center max-w-sm">
        <div className="p-4 rounded-full bg-amber-50 text-amber-500 mb-4">
          <Coins className="w-10 h-10" />
        </div>
        <p className="text-slate-500 font-medium">Current Balance</p>
        <h2 className="text-5xl font-bold text-slate-900 mt-2">
          {balanceLoading ? '...' : balance}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Transaction History</h2>
        </div>
        
        {txLoading ? (
          <div className="p-8 text-center text-slate-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${tx.amount > 0 ? 'bg-emerald-50' : 'bg-rose-50'} ${tx.transaction_type === 'SIGNUP_BONUS' ? 'bg-purple-50' : ''}`}>
                    {getTransactionIcon(tx.transaction_type, tx.amount)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {tx.transaction_type === 'SESSION_EARNED' && 'Earned from Teaching'}
                      {tx.transaction_type === 'SESSION_SPENT' && 'Spent on Learning'}
                      {tx.transaction_type === 'SIGNUP_BONUS' && 'Signup Bonus'}
                    </h4>
                    <p className="text-sm text-slate-500">{tx.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className={`text-xl font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
