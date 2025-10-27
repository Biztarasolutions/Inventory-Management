import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SearchableDropdown from './SearchableDropdown';

export default function Modification() {
  const [selectedReturns, setSelectedReturns] = useState([]);

  const handleReturnCheckbox = (productId) => {
    setSelectedReturns(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const [returnProducts, setReturnProducts] = useState([]);
  const [perOrderPayLater, setPerOrderPayLater] = useState([]);
  const [selectedPayNowOrders, setSelectedPayNowOrders] = useState([]); // array of order_no
  // keep input values as strings so we can hide zero and preserve formatting
  const [paymentUpi, setPaymentUpi] = useState('');
  const [paymentCash, setPaymentCash] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchType, setSearchType] = useState('customer'); // 'customer' or 'order'
    const [actionType, setActionType] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [orderOptions, setOrderOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    async function fetchReturnProducts() {
      if (actionType !== 'Return' || !selectedValue) {
        setReturnProducts([]);
        return;
      }
      // Calculate date 15 days ago
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const isoDate = fifteenDaysAgo.toISOString().split('T')[0];
  let query = supabase.from('Orders').select('order_no, phone_number, product, size, total, pay_later, created_at');
      if (searchType === 'customer') {
        query = query.eq('phone_number', selectedValue);
      } else {
        query = query.eq('order_no', selectedValue);
      }
      query = query.gte('created_at', isoDate);
      const { data, error } = await query;
      if (error) {
        setReturnProducts([]);
        setError('Failed to fetch products: ' + error.message);
        return;
      }
      setReturnProducts(data || []);
    }
    fetchReturnProducts();
  }, [actionType, selectedValue, searchType, refreshKey]);

  // When action is Pay Later, fetch totals: orders' pay_later (count once per order) and transactions from likely tables
  useEffect(() => {
    if (actionType !== 'Pay Later' || !selectedValue) {
      return;
    }

    let mounted = true;
    async function fetchTotals() {
      try {
  // 1) Orders: fetch order_no, pay_later and order_amount for this customer/order
  let ordersQuery = supabase.from('Orders').select('order_no, pay_later, order_amount, customer_name');
        if (searchType === 'customer') ordersQuery = ordersQuery.eq('phone_number', selectedValue);
        else ordersQuery = ordersQuery.eq('order_no', selectedValue);
        const { data: ordersData, error: ordersErr } = await ordersQuery;
        if (ordersErr) throw ordersErr;
        // Sum pay_later once per unique order_no
        const seen = new Set();
        // eslint-disable-next-line no-unused-vars
        let ordersTotal = 0;
        (ordersData || []).forEach(o => {
          const key = o.order_no || JSON.stringify(o);
          if (!seen.has(key)) {
            seen.add(key);
            ordersTotal += Number(o.pay_later) || 0;
          }
        });

        // 2) Transactions: try a list of possible table names and sum a numeric field
        const candidateTables = ['pay_later_transactions', 'payments', 'paylater', 'pay_later_payments', 'pay_later'];
        // eslint-disable-next-line no-unused-vars
        let transactionsTotal = 0;
        for (const table of candidateTables) {
          try {
            let tquery = supabase.from(table).select('*');
            if (searchType === 'customer') tquery = tquery.eq('phone_number', selectedValue);
            else tquery = tquery.eq('order_no', selectedValue);
            const { data, error } = await tquery;
            if (error) {
              // table might not exist — try next
              continue;
            }
            if (!data || data.length === 0) {
              // found table but no rows for this customer — transactionsTotal stays 0
              transactionsTotal = 0;
              break;
            }
            // Determine numeric field to sum
            const possibleFields = ['amount', 'pay_later', 'pay_later_amount', 'paid_amount', 'payment_amount', 'amount_paid'];
            let field = null;
            for (const f of possibleFields) {
              if (data[0] && Object.prototype.hasOwnProperty.call(data[0], f)) {
                field = f;
                break;
              }
            }
            // If no standard field found, find any numeric field in the first row
            if (!field && data[0]) {
              for (const k of Object.keys(data[0])) {
                if (typeof data[0][k] === 'number') { field = k; break; }
                if (typeof data[0][k] === 'string' && !isNaN(Number(data[0][k]))) { field = k; break; }
              }
            }
            if (field) {
              // eslint-disable-next-line no-unused-vars
              transactionsTotal = (data || []).reduce((s, r) => s + (Number(r[field]) || 0), 0);
            } else {
              // couldn't identify numeric field; skip this table
              // eslint-disable-next-line no-unused-vars
              transactionsTotal = 0;
            }
            // stop after first table that returned data
            break;
          } catch (e) {
            // ignore and try next table
            continue;
          }
        }

        // Build per-order breakdown: for each order in ordersData, find transactions sum for that order
        const perOrder = [];
        if (ordersData && ordersData.length > 0) {
          // Build a map of order_no -> { original pay_later, order_amount }
          const orderMap = {};
          ordersData.forEach(o => { orderMap[o.order_no] = { original: Number(o.pay_later) || 0, order_amount: Number(o.order_amount) || 0, customer_name: o.customer_name || '' }; });

          // Fetch transaction sums per order from the exact table `pay later transaction` (upi_amount + cash_amount)
          const transactionsPerOrder = {}; // order_no -> sum
            try {
            let tquery = supabase.from('pay later transaction').select('order_no, upi_amount, cash_amount');
            // Use order_no membership to fetch transactions for these orders so Paid is computed from the transaction table
            const orderNos = Object.keys(orderMap || {});
            if (orderNos.length > 0) {
              tquery = tquery.in('order_no', orderNos);
            } else if (searchType === 'customer') {
              // fallback: try matching by phone_no (some schemas use phone_no)
              tquery = tquery.eq('phone_no', selectedValue);
            }
            const { data: txData, error: txErr } = await tquery;
            if (!txErr && Array.isArray(txData)) {
              txData.forEach(r => {
                const oNo = r.order_no;
                const upi = Number(r.upi_amount) || 0;
                const cash = Number(r.cash_amount) || 0;
                if (!transactionsPerOrder[oNo]) transactionsPerOrder[oNo] = 0;
                transactionsPerOrder[oNo] += upi + cash;
              });
            } else if (txErr) {
              console.error('Failed fetching pay later transaction', txErr);
            }
          } catch (e) {
            console.error('Failed fetching pay later transaction', e);
          }

          Object.keys(orderMap).forEach(oNo => {
            const original = orderMap[oNo].original || 0; // pay_later from Orders
            const order_amount = orderMap[oNo].order_amount || 0;
            const customer_name = orderMap[oNo].customer_name || '';
            const paid = transactionsPerOrder[oNo] || 0;
            const remaining = Math.max(0, original - paid);
            perOrder.push({ order_no: oNo, original, paid, remaining, order_amount, customer_name });
          });
        }

        if (mounted) {
          setPerOrderPayLater(perOrder);
        }
      } catch (err) {
        console.error('Failed to fetch pay later totals:', err);
      }
    }
    fetchTotals();
    return () => { mounted = false; };
  }, [actionType, selectedValue, searchType, refreshKey]);
  // include refreshKey in dependency to allow manual refresh after payments
  
  useEffect(() => {
    async function fetchOptions() {
      setLoading(true);
      setError('');
      try {
        if (searchType === 'customer') {
          // Fetch ALL phone_number and customer_name values from Orders table
          const { data, error } = await supabase
            .from('Orders')
            .select('phone_number, customer_name');
          console.log('Fetched Orders raw response (ALL phone numbers):', { data, error });
          if (error) throw error;
          if (!data || !Array.isArray(data)) {
            console.log('No data returned from Supabase for customer dropdown.');
          }
          // Build unique list of phone -> name
          const phoneToName = {};
          (data || []).forEach(o => {
            const ph = o.phone_number && String(o.phone_number).trim();
            const name = (o.customer_name || '').trim();
            if (ph) phoneToName[ph] = name || phoneToName[ph] || '';
          });
          const customerOptionsArr = Object.keys(phoneToName).map(phone => ({ value: phone, label: phoneToName[phone] ? `${phoneToName[phone]} — ${phone}` : phone }));
          console.log('customerOptions array:', customerOptionsArr);
          console.log('FINAL customerOptions:', customerOptionsArr);
          setCustomerOptions(customerOptionsArr);
        } else {
          // Fetch order numbers from Orders table where Return_flag is False or null
          const { data, error } = await supabase
            .from('Orders')
            .select('order_no, Return_flag');
          if (error) throw error;
          const filtered = (data || []).filter(o => {
            const flag = o.Return_flag;
            if (flag === true) return false;
            if (typeof flag === 'string' && flag.trim().toLowerCase() === 'true') return false;
            return true;
          });
          const orderNos = filtered.map(o => o.order_no).filter(Boolean).map(String);
          const uniqueOrderNos = Array.from(new Set(orderNos));
          setOrderOptions(uniqueOrderNos.map(order_no => ({ value: order_no, label: order_no })));
        }
      } catch (err) {
        console.error('Error fetching options:', err);
        setError('Failed to fetch options: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, [searchType]);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modification</h1>
      {/* Test/debug buttons removed */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Search By</label>
        <select
          className="w-full p-2 border rounded"
          value={searchType}
          onChange={e => setSearchType(e.target.value)}
        >
          <option value="customer">Customer</option>
          <option value="order">Order</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          {searchType === 'customer' ? 'Customer' : 'Order'}
        </label>
        <SearchableDropdown
          value={(() => {
            if (!selectedValue) return null;
            if (searchType === 'customer') {
              // find label from customerOptions
              const opt = (customerOptions || []).find(o => String(o.value) === String(selectedValue));
              return opt ? { label: opt.label, value: opt.value } : { label: selectedValue, value: selectedValue };
            }
            return { label: selectedValue, value: selectedValue };
          })()}
          onChange={opt => setSelectedValue(opt ? opt.value : (typeof opt === 'string' ? opt : ''))}
          options={searchType === 'customer' ? customerOptions : orderOptions}
          placeholder={searchType === 'customer' ? 'Type or select customer (Name — phone)' : 'Type or select order no'}
          allowCustomInput={false}
          className="w-full"
        />
      </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Action</label>
          <select
            className="w-full p-2 border rounded"
            value={actionType}
            onChange={e => setActionType(e.target.value)}
          >
            <option value="">Select Action</option>
            <option value="Return">Return</option>
            <option value="Pay Later">Pay Later</option>
          </select>
        </div>
  {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
      {loading && <div className="text-gray-500">Loading...</div>}

      {/* Show products for Return action */}
      {actionType === 'Return' && selectedValue && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Products Purchased in Last 15 Days</h2>
          {returnProducts.length === 0 ? (
            <div className="text-gray-500">No products found.</div>
          ) : (
            <>
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Return</th>
                    <th className="border px-2 py-1">Product-Size</th>
                    <th className="border px-2 py-1">Total</th>
                    <th className="border px-2 py-1">Pay Later</th>
                  </tr>
                </thead>
                <tbody>
                  {returnProducts.map((prod, idx) => {
                    // Use a unique identifier for each product row (order_no + product + size + idx)
                    const productId = `${prod.order_no}-${prod.product}-${prod.size}-${idx}`;
                    return (
                      <tr key={productId}>
                        <td className="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedReturns.includes(productId)}
                            onChange={() => handleReturnCheckbox(productId)}
                          />
                        </td>
                        <td className="border px-2 py-1">{prod.product + '-' + prod.size}</td>
                        <td className="border px-2 py-1">{prod.total}</td>
                        <td className="border px-2 py-1">{prod.pay_later}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Total Pay Later for this customer (sum once per order) */}
              {searchType === 'customer' && (
                <div className="mt-4 p-3 border rounded bg-gray-50">
                  <strong>Total Pay Later:</strong>{' '}
                  {(() => {
                    // Sum pay_later once per unique order_no
                    const map = {};
                    returnProducts.forEach(p => {
                      if (!map[p.order_no]) {
                        map[p.order_no] = Number(p.pay_later) || 0;
                      }
                    });
                    const total = Object.values(map).reduce((s, v) => s + v, 0);
                    return `₹${total}`;
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {/* Show totals for Pay Later action */}
      {actionType === 'Pay Later' && selectedValue && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Pay Later Summary</h2>
          {/* Totals removed per request; showing per-order breakdown below */}
          {perOrderPayLater && perOrderPayLater.length > 0 && (
            <div className="mt-4">
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Pay Now</th>
                    <th className="border px-2 py-1">Order No</th>
                    <th className="border px-2 py-1">Order Amount</th>
                    <th className="border px-2 py-1">Pay Later</th>
                    <th className="border px-2 py-1">Paid</th>
                    <th className="border px-2 py-1">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {perOrderPayLater.map((r) => (
                    <tr key={r.order_no}>
                      <td className="border px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={selectedPayNowOrders.includes(r.order_no)}
                          onChange={() => {
                            setSelectedPayNowOrders(prev => prev.includes(r.order_no) ? prev.filter(x => x !== r.order_no) : [...prev, r.order_no]);
                          }}
                        />
                      </td>
                      <td className="border px-2 py-1">{r.order_no}</td>
                      <td className="border px-2 py-1">₹{r.order_amount}</td>
                      <td className="border px-2 py-1">₹{r.original}</td>
                      <td className="border px-2 py-1">₹{r.paid}</td>
                      <td className="border px-2 py-1">₹{r.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Payment controls: UPI and Cash inputs like CreateBill */}
              <div className="mt-4 p-3 border rounded bg-white">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">UPI Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md"
                        value={paymentUpi || ''}
                        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => {
                          // strip leading zeros but allow '0.' for decimals
                          let v = e.target.value.replace(/[^0-9.]/g, '');
                          if (v.startsWith('0') && !v.startsWith('0.')) {
                            v = v.replace(/^0+/, '');
                          }
                          setPaymentUpi(v);
                        }}
                        placeholder="Enter UPI amount"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="w-full p-2 border rounded-md"
                        value={paymentCash || ''}
                        onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^0-9.]/g, '');
                          if (v.startsWith('0') && !v.startsWith('0.')) {
                            v = v.replace(/^0+/, '');
                          }
                          setPaymentCash(v);
                        }}
                        placeholder="Enter cash amount"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded-md">
                  {(() => {
                    const selectedTotal = perOrderPayLater.filter(r => selectedPayNowOrders.includes(r.order_no)).reduce((s, r) => s + (r.remaining || 0), 0);
                    const paidTotal = (Number(paymentUpi || 0) || 0) + (Number(paymentCash || 0) || 0);
                    return (
                      <>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span>Selected Total (to pay):</span>
                          <span>₹{selectedTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span>Total Paid (UPI + Cash):</span>
                          <span>₹{paidTotal.toFixed(2)}</span>
                        </div>
                        {/* mismatch message intentionally hidden per user request */}
                      </>
                    );
                  })()}
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                  <button
                    className={`py-2 px-4 rounded ${((Number(paymentUpi || 0) || 0) + (Number(paymentCash || 0) || 0)) === perOrderPayLater.filter(r => selectedPayNowOrders.includes(r.order_no)).reduce((s, r) => s + (r.remaining || 0), 0) ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                    onClick={async () => {
                      const selectedTotal = perOrderPayLater.filter(r => selectedPayNowOrders.includes(r.order_no)).reduce((s, r) => s + (r.remaining || 0), 0);
                      const paidTotal = (Number(paymentUpi || 0) || 0) + (Number(paymentCash || 0) || 0);
                      if (selectedTotal === 0) return;
                      if (Math.abs(paidTotal - selectedTotal) > 0.0001) {
                        // do nothing if totals don't match
                        return;
                      }
                      const ordersToPay = perOrderPayLater.filter(r => selectedPayNowOrders.includes(r.order_no));
                      if (ordersToPay.length === 0) return;
                      let remUpi = Number(paymentUpi) || 0;
                      let remCash = Number(paymentCash) || 0;
                      try {
                        for (const o of ordersToPay) {
                          // For each order, determine how much upi and cash will be applied
                          let upiApplied = 0;
                          let cashApplied = 0;
                          let toPayFromUpi = Math.min(remUpi, o.remaining || 0);
                          if (toPayFromUpi > 0) {
                            upiApplied = toPayFromUpi;
                            remUpi -= toPayFromUpi;
                          }
                          const remainingAfterUpi = Math.max(0, (o.remaining || 0) - upiApplied);
                          let toPayFromCash = Math.min(remCash, remainingAfterUpi);
                          if (toPayFromCash > 0) {
                            cashApplied = toPayFromCash;
                            remCash -= toPayFromCash;
                          }

                          // If any amount applied, insert into pay_later_transactions with upi_amount & cash_amount
                          if (upiApplied > 0 || cashApplied > 0) {
                            try {
                              // Insert into the pay later transaction table with the requested column names
                              const { error: insErr } = await supabase.from('pay later transaction').insert([{
                                order_no: o.order_no,
                                upi_amount: upiApplied,
                                cash_amount: cashApplied,
                                phone_no: selectedValue,
                                customer_name: (o.customer_name || ''),
                                created_at: new Date().toISOString()
                              }]);
                              if (insErr) {
                                console.error('Insert error into pay later transaction for', o.order_no, insErr);
                                setError(`Insert failed: ${insErr.message || JSON.stringify(insErr)}`);
                              } else {
                                // on successful insert, clear any error/status so no status box is shown
                                setError('');
                              }
                            } catch (e) {
                              console.error('Failed to insert into pay later transaction for', o.order_no, e);
                              setError(`Insert exception: ${e.message || String(e)}`);
                            }
                          }
                        }
                        // clear inputs & selections, refresh
                        setSelectedPayNowOrders([]);
                        setPaymentUpi('');
                        setPaymentCash('');
                        setRefreshKey(k => k + 1);
                      } catch (err) {
                        console.error('Payment error', err);
                      }
                    }}
                  >
                    Pay
                  </button>
                  {/* Test insert removed */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
