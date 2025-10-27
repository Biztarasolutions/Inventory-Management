
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


  const [orders, setOrders] = useState([]);

  async function fetchSalesAndExpenses() {
    setLoading(true);
    setError('');
    try {
      const todayIST = getTodayISTDateStr();
      // Fetch Orders for today (IST)
      const { data: ordersData, error: orderErr } = await supabase
        .from('Orders')
        .select('order_no, order_amount, created_at, cash_amount, upi_amount, pay_later')
        .gte('created_at', todayIST + 'T00:00:00+05:30')
        .lte('created_at', todayIST + 'T23:59:59+05:30');
      if (orderErr) throw orderErr;
      setOrders(ordersData || []);

      // Calculate total sales, payment mode breakdown, and distinct order count
      let totalOrderAmount = 0;
      let cash = 0, upi = 0, pay_later = 0;
      const seenOrderNos = new Set();
      (ordersData || []).forEach(o => {
        const key = o.order_no || o.created_at;
        if (!seenOrderNos.has(key)) {
          totalOrderAmount += o.order_amount || 0;
          if (o.cash_amount) cash += o.cash_amount;
          if (o.upi_amount) upi += o.upi_amount;
          if (o.pay_later) pay_later += o.pay_later;
          seenOrderNos.add(key);
        }
      });
      const orderCount = seenOrderNos.size;
      setSalesSummary({ totalOrderAmount, cash, upi, pay_later, orderCount });

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

  // Calculate available cash for current IST date only, using freshly fetched data
  const uniqueOrderCash = {};
  (ordersData || []).forEach(o => {
    const key = o.order_no || o.created_at;
    if (!(key in uniqueOrderCash)) {
      uniqueOrderCash[key] = o.cash_amount || 0;
    }
  });
  const cashFromOrders = Object.values(uniqueOrderCash).reduce((sum, amt) => sum + amt, 0);
  // Also include cash received today via pay later transaction table (cash_amount)
  let cashFromPayLaterTx = 0;
  try {
    // fetch transactions for today in IST
    const { data: payLaterTx } = await supabase
      .from('pay later transaction')
      .select('cash_amount, created_at')
      .gte('created_at', todayIST + 'T00:00:00+05:30')
      .lte('created_at', todayIST + 'T23:59:59+05:30');
    if (Array.isArray(payLaterTx)) {
      cashFromPayLaterTx = payLaterTx.reduce((s, r) => s + (Number(r.cash_amount) || 0), 0);
    }
  } catch (e) {
    console.error('Failed to fetch pay later transactions for cash drawer:', e);
  }
  const cashExpenses = (exp || []).filter(e => (e['payment_mode'] || e['payment mode']) === 'cash').reduce((sum, e) => sum + (e.amount || 0), 0);
  setAvailableCash(cashFromOrders + cashFromPayLaterTx - cashExpenses);
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
        'payment mode': expenseForm.payment_mode,
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
      {/* Minimal Modern Sale Header (Second Option) */}
      <div className="mb-6">
        <div className="flex items-center justify-between border-b pb-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-700">Sale</span>
            <span className="text-lg font-semibold text-gray-600">|</span>
            <span className="text-lg font-bold text-gray-800">{todayISTDisplay}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Cash in Drawer</span>
            <span className="text-lg font-bold text-green-700">₹{Math.round(availableCash).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-2 mb-2 rounded">{success}</div>}
      <div className="bg-white rounded shadow p-4 mb-6">
        {/* Make card grid horizontally scrollable on mobile, prevent blank space */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 overflow-x-auto snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sales Card - Rupee symbol with payment breakdown */}
          <div className="flex flex-col items-center justify-center bg-green-50 rounded-lg shadow p-4">
            <div className="mb-2 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <text x="4" y="20" fontSize="18" fontFamily="Arial">₹</text>
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-700">₹{Math.round(salesSummary.totalOrderAmount || 0).toLocaleString('en-IN')}</div>
            <div className="text-sm text-green-700 mt-1">Sales</div>
            <div className="mt-2 w-full flex flex-row items-center justify-center gap-4 text-xs text-gray-700">
              <div className="flex items-center gap-1">
                {/* Cash symbol: money bill */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="7" width="20" height="10" rx="2" fill="#bbf7d0" stroke="#059669" strokeWidth="1" />
                  <text x="8" y="16" fontSize="8" fontFamily="Arial" fill="#059669">₹</text>
                </svg>
                <span className="font-semibold">₹{Math.round(salesSummary.cash || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* UPI symbol: mobile phone */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="7" y="3" width="10" height="18" rx="2" fill="#dbeafe" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="12" cy="19" r="1" fill="#2563eb" />
                </svg>
                <span className="font-semibold">₹{Math.round(salesSummary.upi || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Pay Later symbol: clock */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8" fill="#fef9c3" stroke="#eab308" strokeWidth="1" />
                  <rect x="11" y="7" width="2" height="6" rx="1" fill="#eab308" />
                  <rect x="12" y="12" width="4" height="2" rx="1" fill="#eab308" />
                </svg>
                <span className="font-semibold">₹{Math.round(salesSummary.pay_later || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          {/* Orders Card - Full Shopping Cart */}
          <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg shadow p-4">
            <div className="mb-2 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 18c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2zm10 0c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2zM7.16 16l.84-2h7.18l.84 2H7.16zm12.24-2.34l-1.72-7.45A2.003 2.003 0 0 0 15.75 5H6.21l-.94-2H2v2h2l3.6 7.59-1.35 2.44C5.16 16.37 5.52 17 6.16 17h12v-2H7.42l.94-1.68h7.45c.75 0 1.41-.41 1.74-1.04z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-blue-700">{(salesSummary.orderCount || 0).toLocaleString('en-IN')}</div>
            <div className="text-sm text-blue-700 mt-1">Orders</div>
            <div className="text-xs text-gray-500 mt-1">{orders && orders.length > 0 ? new Date(orders[orders.length-1].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '--'}</div>
          </div>
          {/* Returns Card - Undo Arrow */}
          <div className="flex flex-col items-center justify-center bg-yellow-50 rounded-lg shadow p-4">
            <div className="mb-2 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l-6-6m0 0l6-6m-6 6h18" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-yellow-700">0</div>
            <div className="text-sm text-yellow-700 mt-1">Returns</div>
          </div>
          {/* Expense Card - Money with Wings Emoji */}
          <div className="flex flex-col items-center justify-center bg-red-50 rounded-lg shadow p-4">
            <div className="mb-2 text-red-600 text-2xl">💸</div>
            <div className="text-2xl font-bold text-red-700">₹{Math.round(expenses.reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString('en-IN')}</div>
            <div className="text-sm text-red-700 mt-1">Expense</div>
            <div className="text-xs text-gray-500 mt-1">{expenses && expenses.length > 0 ? new Date(expenses[expenses.length-1].created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '--'}</div>
          </div>
        </div>
        {/* Removed duplicate Cash, UPI, Pay Later breakdown below cards */}
        {/* Removed duplicate Cash in Drawer section below cards */}
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
          <div className="overflow-x-auto">
            <table className="min-w-max text-sm mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-0.5 py-1 text-left">Time</th>
                  <th className="px-0.5 py-1 text-left">Expense</th>
                  <th className="px-0.5 py-1 text-left">Amount</th>
                  <th className="px-0.5 py-1 text-left">Payment Mode</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-0.5 py-1">{new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</td>
                    <td className="px-0.5 py-1">{e.expense}</td>
                    <td className="px-0.5 py-1">₹{e.amount}</td>
                    <td className="px-0.5 py-1 capitalize">{(e['payment_mode'] || e['payment mode'] || '').replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
