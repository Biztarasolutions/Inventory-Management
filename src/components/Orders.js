import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateTime } from '../App';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left font-medium border">Date Time</th>
                  <th className="p-2 text-left font-medium border">Order No</th>
                  <th className="p-2 text-left font-medium border">Customer Name</th>
                  <th className="p-2 text-left font-medium border">Phone Number</th>
                  <th className="p-2 text-left font-medium border">Product</th>
                  <th className="p-2 text-left font-medium border">Size</th>
                  <th className="p-2 text-right font-medium border">MRP</th>
                  <th className="p-2 text-right font-medium border">Product Discount</th>
                  <th className="p-2 text-right font-medium border">Selling Price</th>
                  <th className="p-2 text-center font-medium border">Quantity</th>
                  <th className="p-2 text-right font-medium border">Total</th>
                  <th className="p-2 text-right font-medium border">Order Discount</th>
                  <th className="p-2 text-right font-medium border">Order Amount</th>
                  <th className="p-2 text-right font-medium border">UPI Amount</th>
                  <th className="p-2 text-right font-medium border">Cash Amount</th>
                  <th className="p-2 text-right font-medium border">Pay Later</th>
                  <th className="p-2 text-right font-medium border">Net Pay Later</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-2 border">{formatDateTime(order.created_at)}</td>
                    <td className="p-2 border">{order.order_no}</td>
                    <td className="p-2 border">{order.customer_name}</td>
                    <td className="p-2 border">{order.phone_number}</td>
                    <td className="p-2 border">{order.product}</td>
                    <td className="p-2 border">{order.size}</td>
                    <td className="p-2 border text-right">₹{order.mrp.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{calculateProductDiscount(order).toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{order.selling_price.toFixed(2)}</td>
                    <td className="p-2 border text-center">{order.quantity}</td>
                    <td className="p-2 border text-right">₹{order.total.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{calculateOrderDiscount(order).toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{order.order_amount.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{order.upi_amount.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{order.cash_amount.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{order.pay_later.toFixed(2)}</td>
                    <td className="p-2 border text-right">₹{(order.net_pay_later || 0).toFixed(2)}</td>
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
