import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Expense() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('expense')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      setError('Failed to fetch expenses: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">All Expenses</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-gray-500">No expenses found.</div>
      ) : (
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Date/Time</th>
              <th className="p-2 text-left">Expense</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Payment Mode</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={e.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2">{new Date(e.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                <td className="p-2">{e.expense}</td>
                <td className="p-2">₹{e.amount}</td>
                <td className="p-2 capitalize">{(e['payment mode'] || '').replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
