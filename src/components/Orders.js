import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateTime, formatIndianNumber } from '../App';
import FilterDropdown from './FilterDropdown';
import DateRangeFilter from './DateRangeFilter';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    datetime: null,
    order_no: [],
    customer_name: [],
    phone_number: [],
    product: [],
    size: [],
    mrp: [],
    quantity: [],
    pay_later: [],
    net_pay_later: []
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Fetch related pay-later transactions for these orders to compute net pay later
      let enriched = data;
      try {
        const orderNos = (data || []).map(o => o.order_no).filter(Boolean);
        if (orderNos.length > 0) {
          const { data: txData, error: txError } = await supabase
            .from('pay later transaction')
            .select('order_no, upi_amount, cash_amount')
            .in('order_no', orderNos);

          if (txError) {
            console.error('Error fetching pay later transactions:', txError);
          } else if (txData) {
            const paidMap = {};
            txData.forEach(tx => {
              const paid = Number(tx.upi_amount || 0) + Number(tx.cash_amount || 0);
              paidMap[tx.order_no] = (paidMap[tx.order_no] || 0) + paid;
            });

            enriched = data.map(o => {
              const paid = paidMap[o.order_no] || 0;
              const net = Math.max(0, (Number(o.pay_later) || 0) - paid);
              return { ...o, paid_from_transactions: paid, net_pay_later: net };
            });
          }
        }
      } catch (innerErr) {
        console.error('Error computing net pay later:', innerErr);
      }

      setOrders(enriched);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProductDiscount = (order) => {
    if (order.discount_type === 'fixed') {
      return order.discount || 0;
    } else { // percentage
      return ((order.mrp * (order.discount || 0)) / 100);
    }
  };

  const calculateOrderDiscount = (order) => {
    if (order.order_discount_type === 'fixed' || order.order_discount_type === 'amount') {
      return order.order_discount || 0;
    } else { // percentage
      // (total mrp - item discount) * order_discount / 100
      const totalMrp = order.mrp * order.quantity;
      const itemDiscount = (order.discount_type === 'fixed')
        ? (order.discount || 0)
        : ((order.mrp * (order.discount || 0)) / 100);
      return ((totalMrp - itemDiscount) * (order.order_discount || 0)) / 100;
    }
  };

  // Prepare enriched data for filtering
  const enrichedData = orders.map(order => ({
    ...order,
    formatted_date: formatDateTime(order.created_at)
  }));

  // Apply filters
  const filteredOrders = enrichedData.filter(order => {
    // Date range filter logic
    let dateMatch = true;
    if (filters.datetime && filters.datetime.startDate && filters.datetime.endDate) {
      const orderDate = new Date(order.created_at);
      const start = new Date(filters.datetime.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.datetime.endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch = orderDate >= start && orderDate <= end;
    }

    // Pay Later filter logic (zero or non-zero)
    let payLaterMatch = true;
    if (filters.pay_later.length > 0) {
      const payLaterAmount = order.pay_later || 0;
      const isZero = payLaterAmount === 0;
      payLaterMatch = filters.pay_later.includes(isZero ? 'Zero' : 'Non-Zero');
    }

    // Net Pay Later filter logic (zero or non-zero)
    let netPayLaterMatch = true;
    if (filters.net_pay_later.length > 0) {
      const netPayLaterAmount = order.net_pay_later || 0;
      const isZero = netPayLaterAmount === 0;
      netPayLaterMatch = filters.net_pay_later.includes(isZero ? 'Zero' : 'Non-Zero');
    }

    return (
      dateMatch &&
      payLaterMatch &&
      netPayLaterMatch &&
      (filters.order_no.length === 0 || filters.order_no.includes(order.order_no?.toString() || '')) &&
      (filters.customer_name.length === 0 || filters.customer_name.includes(order.customer_name || '')) &&
      (filters.phone_number.length === 0 || filters.phone_number.includes(order.phone_number?.toString() || '')) &&
      (filters.product.length === 0 || filters.product.includes(order.product || '')) &&
      (filters.size.length === 0 || filters.size.includes(order.size || '')) &&
      (filters.mrp.length === 0 || filters.mrp.includes(order.mrp?.toString() || '')) &&
      (filters.quantity.length === 0 || filters.quantity.includes(order.quantity?.toString() || ''))
    );
  });

  // Function to get dynamic filter options based on current filtered data
  const getDynamicFilterOptions = (filterKey) => {
    // Create a temporarily filtered dataset excluding the current filter to avoid empty options
    const tempFilters = { ...filters };
    tempFilters[filterKey] = []; // Remove current filter to get all available options
    
    const tempFilteredData = enrichedData.filter(order => {
      // Date range filter logic
      let dateMatch = true;
      if (tempFilters.datetime && tempFilters.datetime.startDate && tempFilters.datetime.endDate) {
        const orderDate = new Date(order.created_at);
        const start = new Date(tempFilters.datetime.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(tempFilters.datetime.endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch = orderDate >= start && orderDate <= end;
      }

      // Pay Later filter logic (zero or non-zero)
      let payLaterMatch = true;
      if (tempFilters.pay_later.length > 0) {
        const payLaterAmount = order.pay_later || 0;
        const isZero = payLaterAmount === 0;
        payLaterMatch = tempFilters.pay_later.includes(isZero ? 'Zero' : 'Non-Zero');
      }

      // Net Pay Later filter logic (zero or non-zero)
      let netPayLaterMatch = true;
      if (tempFilters.net_pay_later.length > 0) {
        const netPayLaterAmount = order.net_pay_later || 0;
        const isZero = netPayLaterAmount === 0;
        netPayLaterMatch = tempFilters.net_pay_later.includes(isZero ? 'Zero' : 'Non-Zero');
      }

      return (
        dateMatch &&
        payLaterMatch &&
        netPayLaterMatch &&
        (tempFilters.order_no.length === 0 || tempFilters.order_no.includes(order.order_no?.toString() || '')) &&
        (tempFilters.customer_name.length === 0 || tempFilters.customer_name.includes(order.customer_name || '')) &&
        (tempFilters.phone_number.length === 0 || tempFilters.phone_number.includes(order.phone_number?.toString() || '')) &&
        (tempFilters.product.length === 0 || tempFilters.product.includes(order.product || '')) &&
        (tempFilters.size.length === 0 || tempFilters.size.includes(order.size || '')) &&
        (tempFilters.mrp.length === 0 || tempFilters.mrp.includes(order.mrp?.toString() || '')) &&
        (tempFilters.quantity.length === 0 || tempFilters.quantity.includes(order.quantity?.toString() || ''))
      );
    });

    // Return unique values for the specified filter key
    switch (filterKey) {
      case 'order_no':
        return [...new Set(tempFilteredData.map(order => order.order_no?.toString() || '').filter(Boolean))].sort();
      case 'customer_name':
        return [...new Set(tempFilteredData.map(order => order.customer_name || '').filter(Boolean))].sort();
      case 'phone_number':
        return [...new Set(tempFilteredData.map(order => order.phone_number?.toString() || '').filter(Boolean))].sort();
      case 'product':
        return [...new Set(tempFilteredData.map(order => order.product || '').filter(Boolean))].sort();
      case 'size':
        return [...new Set(tempFilteredData.map(order => order.size || '').filter(Boolean))].sort((a, b) => {
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const aIndex = sizeOrder.indexOf(a);
          const bIndex = sizeOrder.indexOf(b);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.localeCompare(b);
        });
      case 'mrp':
        return [...new Set(tempFilteredData.map(order => order.mrp?.toString() || '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      case 'quantity':
        return [...new Set(tempFilteredData.map(order => order.quantity?.toString() || '').filter(Boolean))].sort((a, b) => Number(a) - Number(b));
      case 'pay_later':
        return ['Zero', 'Non-Zero'];
      case 'net_pay_later':
        return ['Zero', 'Non-Zero'];
      default:
        return [];
    }
  };

  // Reset filters function
  const resetAllFilters = () => {
    setFilters({
      datetime: null,
      order_no: [],
      customer_name: [],
      phone_number: [],
      product: [],
      size: [],
      mrp: [],
      quantity: [],
      pay_later: [],
      net_pay_later: []
    });
  };

  // Calculate order summary from filtered data
  const calculateOrderSummary = () => {
    const uniqueCustomers = new Set();
    const uniqueOrders = new Set();
    let totalSales = 0;
    let totalQuantity = 0;
    let totalUpiAmount = 0;
    let totalCashAmount = 0;
    let totalPayLater = 0;
    let totalNetPayLater = 0;
    
    filteredOrders.forEach(order => {
      uniqueCustomers.add(order.customer_name);
      uniqueOrders.add(order.order_no);
      totalSales += (order.total || 0);
      totalQuantity += (order.quantity || 0);
      totalUpiAmount += (order.upi_amount || 0);
      totalCashAmount += (order.cash_amount || 0);
      totalPayLater += (order.pay_later || 0);
      totalNetPayLater += (order.net_pay_later || 0);
    });
    
    return {
      customersCount: uniqueCustomers.size,
      ordersCount: uniqueOrders.size,
      totalSales,
      totalQuantity,
      totalUpiAmount,
      totalCashAmount,
      totalPayLater,
      totalNetPayLater
    };
  };

  const { customersCount, ordersCount, totalSales, totalQuantity, totalUpiAmount, totalCashAmount, totalPayLater, totalNetPayLater } = calculateOrderSummary();

  // Using the common formatDateTime function from App.js

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading orders: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          
          <div className="flex flex-wrap justify-between items-center mb-6">
            <div className="bg-white p-3 rounded-lg shadow-sm mb-2 md:mb-0">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Order Summary:</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="bg-blue-100 px-3 py-1 rounded-md">
                  <span className="font-medium">Customers: {formatIndianNumber(customersCount)}</span>
                </div>
                <div className="bg-green-100 px-3 py-1 rounded-md">
                  <span className="font-medium">Orders: {formatIndianNumber(ordersCount)}</span>
                </div>
                <div className="bg-orange-100 px-3 py-1 rounded-md">
                  <span className="font-medium">Qty: {formatIndianNumber(totalQuantity)}</span>
                </div>
                <div className="bg-purple-100 px-3 py-1 rounded-md">
                  <span className="font-medium">Sales: ₹{formatIndianNumber(totalSales)}</span>
                </div>
                <div className="bg-red-100 px-3 py-1 rounded-md">
                  <span className="font-medium">Net Pay Later: ₹{formatIndianNumber(totalNetPayLater)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear All Filters
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <DateRangeFilter
                      label="Date Time"
                      allDates={[...new Set(enrichedData.map(order => order.formatted_date))]}
                      selectedRange={filters.datetime}
                      onChange={(values) => setFilters(prev => ({ ...prev, datetime: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Order No"
                      options={getDynamicFilterOptions('order_no')}
                      selectedValues={filters.order_no}
                      onChange={(values) => setFilters(prev => ({ ...prev, order_no: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Customer"
                      options={getDynamicFilterOptions('customer_name')}
                      selectedValues={filters.customer_name}
                      onChange={(values) => setFilters(prev => ({ ...prev, customer_name: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Phone"
                      options={getDynamicFilterOptions('phone_number')}
                      selectedValues={filters.phone_number}
                      onChange={(values) => setFilters(prev => ({ ...prev, phone_number: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Product"
                      options={getDynamicFilterOptions('product')}
                      selectedValues={filters.product}
                      onChange={(values) => setFilters(prev => ({ ...prev, product: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Size"
                      options={getDynamicFilterOptions('size')}
                      selectedValues={filters.size}
                      onChange={(values) => setFilters(prev => ({ ...prev, size: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="MRP"
                      options={getDynamicFilterOptions('mrp')}
                      selectedValues={filters.mrp}
                      onChange={(values) => setFilters(prev => ({ ...prev, mrp: values }))}
                    />
                  </th>
                  <th className="p-2 text-right font-medium border">Product Discount</th>
                  <th className="p-2 text-right font-medium border">Selling Price</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Quantity"
                      options={getDynamicFilterOptions('quantity')}
                      selectedValues={filters.quantity}
                      onChange={(values) => setFilters(prev => ({ ...prev, quantity: values }))}
                    />
                  </th>
                  <th className="p-2 text-right font-medium border">Total</th>
                  <th className="p-2 text-right font-medium border">Order Discount</th>
                  <th className="p-2 text-right font-medium border">Order Amount</th>
                  <th className="p-2 text-right font-medium border">UPI Amount</th>
                  <th className="p-2 text-right font-medium border">Cash Amount</th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Pay Later"
                      options={getDynamicFilterOptions('pay_later')}
                      selectedValues={filters.pay_later}
                      onChange={(values) => setFilters(prev => ({ ...prev, pay_later: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border min-w-[120px]">
                    <FilterDropdown
                      label="Net Pay Later"
                      options={getDynamicFilterOptions('net_pay_later')}
                      selectedValues={filters.net_pay_later}
                      onChange={(values) => setFilters(prev => ({ ...prev, net_pay_later: values }))}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border text-sm">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-3 border text-sm">{order.order_no}</td>
                    <td className="px-4 py-3 border text-sm">{order.customer_name}</td>
                    <td className="px-4 py-3 border text-sm">{order.phone_number}</td>
                    <td className="px-4 py-3 border text-sm">{order.product}</td>
                    <td className="px-4 py-3 border text-sm">{order.size}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.mrp)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(calculateProductDiscount(order))}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.selling_price)}</td>
                    <td className="px-4 py-3 border text-sm text-center">{formatIndianNumber(order.quantity)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.total)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(calculateOrderDiscount(order))}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.order_amount)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.upi_amount)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.cash_amount)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.pay_later)}</td>
                    <td className="px-4 py-3 border text-sm text-right">₹{formatIndianNumber(order.net_pay_later || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
