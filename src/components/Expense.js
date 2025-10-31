import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatIndianNumber } from '../App';
import FilterDropdown from './FilterDropdown';
import DateRangeFilter from './DateRangeFilter';

export default function Expense() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    datetime: null,
    expense: [],
    amount: [],
    payment_mode: []
  });

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

  // Prepare enriched data for filtering
  const enrichedData = expenses.map(expense => ({
    ...expense,
    formatted_date: new Date(expense.created_at).toLocaleString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true, 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      timeZone: 'Asia/Kolkata' 
    })
  }));

  // Apply filters
  const filteredExpenses = enrichedData.filter(expense => {
    // Date range filter logic
    let dateMatch = true;
    if (filters.datetime && filters.datetime.startDate && filters.datetime.endDate) {
      const expenseDate = new Date(expense.created_at);
      const start = new Date(filters.datetime.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.datetime.endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch = expenseDate >= start && expenseDate <= end;
    }

    return (
      dateMatch &&
      (filters.expense.length === 0 || filters.expense.includes(expense.expense || '')) &&
      (filters.amount.length === 0 || filters.amount.includes(expense.amount?.toString() || '')) &&
      (filters.payment_mode.length === 0 || filters.payment_mode.includes(expense['payment mode'] || ''))
    );
  });

  // Function to get dynamic filter options based on current filtered data
  const getDynamicFilterOptions = (filterKey) => {
    // Create a temporarily filtered dataset excluding the current filter to avoid empty options
    const tempFilters = { ...filters };
    tempFilters[filterKey] = []; // Remove current filter to get all available options
    
    const tempFilteredData = enrichedData.filter(expense => {
      // Date range filter logic
      let dateMatch = true;
      if (tempFilters.datetime && tempFilters.datetime.startDate && tempFilters.datetime.endDate) {
        const expenseDate = new Date(expense.created_at);
        const start = new Date(tempFilters.datetime.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(tempFilters.datetime.endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch = expenseDate >= start && expenseDate <= end;
      }

      return (
        dateMatch &&
        (tempFilters.expense.length === 0 || tempFilters.expense.includes(expense.expense || '')) &&
        (tempFilters.amount.length === 0 || tempFilters.amount.includes(expense.amount?.toString() || '')) &&
        (tempFilters.payment_mode.length === 0 || tempFilters.payment_mode.includes(expense['payment mode'] || ''))
      );
    });

    // Return unique values for the specified filter key
    switch (filterKey) {
      case 'expense':
        return [...new Set(tempFilteredData.map(expense => expense.expense || '').filter(Boolean))].sort();
      case 'amount':
        return [...new Set(tempFilteredData.map(expense => expense.amount?.toString() || '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      case 'payment_mode':
        return [...new Set(tempFilteredData.map(expense => expense['payment mode'] || '').filter(Boolean))].sort();
      default:
        return [];
    }
  };

  // Calculate expense summary
  const calculateExpenseSummary = () => {
    let totalExpenses = filteredExpenses.length;
    let totalAmount = 0;
    const expenseBreakdown = {};
    const distinctExpenses = new Set();

    filteredExpenses.forEach(expense => {
      totalAmount += (expense.amount || 0);
      const expenseName = expense.expense || 'Unknown';
      distinctExpenses.add(expenseName);
      expenseBreakdown[expenseName] = (expenseBreakdown[expenseName] || 0) + (expense.amount || 0);
    });

    return { 
      totalExpenses, 
      totalAmount, 
      distinctExpenseCount: distinctExpenses.size, 
      expenseBreakdown 
    };
  };

  const { totalExpenses, totalAmount, distinctExpenseCount, expenseBreakdown } = calculateExpenseSummary();

  // Reset filters function
  const resetAllFilters = () => {
    setFilters({
      datetime: null,
      expense: [],
      amount: [],
      payment_mode: []
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Expenses</h1>
      
      {/* Expense Summary */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="bg-white p-3 rounded-lg shadow-sm mb-2 md:mb-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Expense Summary:</h3>
          <div className="flex flex-wrap gap-3 items-center mb-2">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full shadow">
              <span className="font-medium">Expenses: {formatIndianNumber(distinctExpenseCount)}</span>
            </div>
            <div className="bg-green-500 text-white px-3 py-1 rounded-full shadow">
              <span className="font-medium">Total: ₹{formatIndianNumber(totalAmount)}</span>
            </div>
          </div>
          {Object.keys(expenseBreakdown).length > 0 && (
            <div className="text-xs text-gray-600 flex flex-wrap gap-2">
              {Object.entries(expenseBreakdown).map(([expenseName, amount]) => (
                <span key={expenseName} className="bg-gray-50 px-2 py-1 rounded">
                  {expenseName}: ₹{formatIndianNumber(amount)}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={resetAllFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-gray-500">No expenses found.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <DateRangeFilter
                      label="Date/Time"
                      allDates={[...new Set(enrichedData.map(expense => expense.formatted_date))]}
                      selectedRange={filters.datetime}
                      onChange={(values) => setFilters(prev => ({ ...prev, datetime: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Expense"
                      options={getDynamicFilterOptions('expense')}
                      selectedValues={filters.expense}
                      onChange={(values) => setFilters(prev => ({ ...prev, expense: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Amount"
                      options={getDynamicFilterOptions('amount')}
                      selectedValues={filters.amount}
                      onChange={(values) => setFilters(prev => ({ ...prev, amount: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Payment Mode"
                      options={getDynamicFilterOptions('payment_mode')}
                      selectedValues={filters.payment_mode}
                      onChange={(values) => setFilters(prev => ({ ...prev, payment_mode: values }))}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, i) => (
                  <tr key={expense.id || i} className="hover:bg-gray-50">
                    <td className="p-2 border-b">{expense.formatted_date}</td>
                    <td className="p-2 border-b">{expense.expense}</td>
                    <td className="p-2 border-b">₹{formatIndianNumber(expense.amount)}</td>
                    <td className="p-2 border-b capitalize">{(expense['payment mode'] || '').replace('_', ' ')}</td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">No expenses found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
