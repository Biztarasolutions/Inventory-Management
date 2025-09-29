
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import SearchableDropdown from './SearchableDropdown';

const PAYMENT_MODES = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Pay Later', value: 'pay_later' },
];


// Get today's date string in IST (Asia/Kolkata)
function getTodayISTDateStr() {
  const now = new Date();
  // Convert to IST by using toLocaleString and then parse back
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  // istString is MM/DD/YYYY, convert to YYYY-MM-DD
  const [month, day, year] = istString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export default function Sales() {
  const [salesSummary, setSalesSummary] = useState({ cash: 0, upi: 0, pay_later: 0, total: 0 });
  const [availableCash, setAvailableCash] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    expense: '',
    amount: '',
    payment_mode: 'cash',
    isOther: false,
    newExpense: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get today's date in IST for display
  const todayISTDisplay = (() => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  })();

  // Fetch today's sales and expenses
  useEffect(() => {
    fetchSalesAndExpenses();
  }, []);


  async function fetchSalesAndExpenses() {
    setLoading(true);
    setError('');
    try {
      const todayIST = getTodayISTDateStr();
      // Fetch Orders for today (IST)
      const { data: orders, error: orderErr } = await supabase
        .from('Orders')
        .select('order_amount, created_at, cash_amount, upi_amount, pay_later')
        .gte('created_at', todayIST + 'T00:00:00+05:30')
        .lte('created_at', todayIST + 'T23:59:59+05:30');
      if (orderErr) throw orderErr;

      // Calculate total sales and payment mode breakdown
      let totalOrderAmount = 0;
      let cash = 0, upi = 0, pay_later = 0;
      const seen = new Set();
      (orders || []).forEach(o => {
        const key = o.order_no || o.created_at;
        if (!seen.has(key)) {
          totalOrderAmount += o.order_amount || 0;
          // Payment mode breakdown (if fields exist)
          if (o.cash_amount) cash += o.cash_amount;
          if (o.upi_amount) upi += o.upi_amount;
          if (o.pay_later) pay_later += o.pay_later;
          seen.add(key);
        }
      });
      setSalesSummary({ totalOrderAmount, cash, upi, pay_later });

      // Fetch all expenses for today (IST)
      const { data: exp, error: expErr } = await supabase
        .from('expense')
        .select('*')
        .gte('created_at', todayIST + 'T00:00:00+05:30')
        .lte('created_at', todayIST + 'T23:59:59+05:30');
      if (expErr) throw expErr;
      setExpenses(exp || []);

      // Fetch all unique expense names for dropdown (from 'expense' column only)
      const { data: allExp, error: allExpErr } = await supabase
        .from('expense')
        .select('expense')
        .neq('expense', null);
      if (allExpErr) throw allExpErr;
      // Only use unique, non-empty values from the 'expense' column
      const uniqueOptions = Array.from(new Set((allExp || []).map(e => (e.expense || '').trim()).filter(e => e))).map(e => ({ label: e, value: e }));
      setExpenseOptions(uniqueOptions);

  // Calculate available cash: cash from orders - cash expenses
  // Sum cash_amount only once per unique order (by order_no or created_at)
  const seenCash = new Set();
  const cashFromOrders = (orders || []).reduce((sum, o) => {
    const key = o.order_no || o.created_at;
    if (!seenCash.has(key)) {
      seenCash.add(key);
      return sum + (o.cash_amount || 0);
    }
    return sum;
  }, 0);
  const cashExpenses = (exp || []).filter(e => (e['payment_mode'] || e['payment mode']) === 'cash').reduce((sum, e) => sum + (e.amount || 0), 0);
  setAvailableCash(cashFromOrders - cashExpenses);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle expense form changes
  function handleExpenseChange(field, value) {
    if (field === 'expense') {
      setExpenseForm(f => ({ ...f, expense: value, isOther: value === 'other', newExpense: '' }));
    } else {
      setExpenseForm(f => ({ ...f, [field]: value }));
    }
  }

  // Add new expense
  async function handleAddExpense(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    let expenseName = '';
    if (expenseForm.isOther) {
      expenseName = expenseForm.newExpense.trim();
    } else {
      // Use the selected dropdown value as expense name
      expenseName = expenseForm.expense;
    }
    if (!expenseName) return setError('Expense name required');
    if (!expenseForm.amount || isNaN(expenseForm.amount) || Number(expenseForm.amount) <= 0) return setError('Valid amount required');
    if (!expenseForm.payment_mode) return setError('Select payment mode');
    setLoading(true);
    try {
      const { error: insertErr } = await supabase.from('expense').insert({
        expense: expenseName,
        amount: Number(expenseForm.amount),
        payment_mode: expenseForm.payment_mode,
      });
      if (insertErr) throw insertErr;
      setSuccess('Expense added!');
      setExpenseForm({ expense: '', amount: '', payment_mode: 'cash', isOther: false, newExpense: '' });
      await fetchSalesAndExpenses();
    } catch (err) {
      setError('Failed to add expense: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sale: {todayISTDisplay}</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-2 mb-2 rounded">{success}</div>}
      <div className="bg-white rounded shadow p-4 mb-6">
    {/* Removed 'Today's Sales' section title as requested */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="p-2 bg-yellow-50 rounded col-span-2">
            <div className="text-sm text-gray-500">Total Sales:</div>
            <div className="text-xl font-bold">₹{(salesSummary.totalOrderAmount || 0).toFixed(2)}</div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="text-sm text-gray-700">Cash: <span className="font-semibold">₹{(salesSummary.cash || 0).toFixed(2)}</span></span>
              <span className="text-sm text-gray-700">UPI: <span className="font-semibold">₹{(salesSummary.upi || 0).toFixed(2)}</span></span>
              <span className="text-sm text-gray-700">Pay Later: <span className="font-semibold">₹{(salesSummary.pay_later || 0).toFixed(2)}</span></span>
            </div>
          </div>
        </div>
        <div className="mt-2 p-2 bg-green-50 rounded">
          <div className="text-sm text-gray-500">Available Cash</div>
          <div className="text-xl font-bold text-green-700">₹{availableCash.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Add Expense</h2>
        <form onSubmit={handleAddExpense} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Expense Name</label>
            <SearchableDropdown
              value={expenseForm.expense ? { label: expenseForm.expense, value: expenseForm.expense } : null}
              onChange={opt => handleExpenseChange('expense', opt ? opt.value : (typeof opt === 'string' ? opt : ''))}
              options={expenseOptions}
              placeholder="Type or select expense"
              allowCustomInput={true}
              onInputChange={val => handleExpenseChange('expense', val)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded"
              value={expenseForm.amount}
              onChange={e => handleExpenseChange('amount', e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select
              className="w-full p-2 border rounded"
              value={expenseForm.payment_mode}
              onChange={e => handleExpenseChange('payment_mode', e.target.value)}
            >
              {PAYMENT_MODES.map(pm => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={
              loading ||
              !expenseForm.expense ||
              !expenseForm.amount ||
              isNaN(expenseForm.amount) ||
              Number(expenseForm.amount) <= 0 ||
              !expenseForm.payment_mode
            }
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Today's Expenses</h2>
        {expenses.length === 0 ? (
          <div className="text-gray-500">No expenses added today.</div>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Expense</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2">{new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</td>
                  <td className="p-2">{e.expense}</td>
                  <td className="p-2">₹{e.amount}</td>
                  <td className="p-2 capitalize">{(e['payment_mode'] || e['payment mode'] || '').replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
