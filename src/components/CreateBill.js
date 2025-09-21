import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SearchableDropdown from './SearchableDropdown';

export function CreateBill() {
  const [customer, setCustomer] = useState({
    phone: '',
    name: '',
    isExisting: false
  });

  const [billItems, setBillItems] = useState([
    { 
      id: 1, 
      product_code: '', 
      size: '', 
      mrp: 0, 
      quantity: 1,
      discount: { type: 'percentage', value: 0 },
      sellingPrice: 0,
      total: 0,
      availableQuantity: 0 
    }
  ]);
  const [discount, setDiscount] = useState({
    type: 'percentage',
    value: 0
  });

  const [payment, setPayment] = useState({
    upi: 0,
    cash: 0,
    payLater: 0
  });
  
  const [products, setProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState({});
  const [inventoryQuantities, setInventoryQuantities] = useState({});

  useEffect(() => {
    const fetchAndSetData = async () => {
      try {
        await fetchData();
      } catch (error) {
        console.error('Error in useEffect:', error);
      }
    };
    fetchAndSetData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryData, productsData] = await Promise.all([
        supabase.from('inventory').select('*'),
        supabase.from('products').select('*')
      ]);

      const inventoryItems = inventoryData.data || [];
      const productItems = productsData.data || [];
      setProducts(productItems);
      
      const inventoryByProductAndSize = {};
      const productCodesWithInventory = new Set();
      const sizeOpts = {};
      
      inventoryItems.forEach(item => {
        const product = productItems.find(p => p.id === item.product_id);
        if (product) {
          const productCode = product.code.toString();
          const size = item.size;
          const quantity = item.quantity || 0;
          
          if (!inventoryByProductAndSize[productCode]) {
            inventoryByProductAndSize[productCode] = {};
          }
          
          if (!inventoryByProductAndSize[productCode][size]) {
            inventoryByProductAndSize[productCode][size] = 0;
          }
          
          inventoryByProductAndSize[productCode][size] += quantity;
          
          if (inventoryByProductAndSize[productCode][size] > 0) {
            productCodesWithInventory.add(productCode);
            
            if (!sizeOpts[productCode]) {
              sizeOpts[productCode] = [];
            }
            if (size && !sizeOpts[productCode].includes(size)) {
              sizeOpts[productCode].push(size);
            }
          }
        }
      });
      
      Object.keys(sizeOpts).forEach(productCode => {
        sizeOpts[productCode] = sizeOpts[productCode].filter(size => 
          inventoryByProductAndSize[productCode][size] > 0
        );
      });
      
      const productOpts = Array.from(productCodesWithInventory)
        .filter(code => {
          const sizes = Object.keys(inventoryByProductAndSize[code] || {});
          return sizes.some(size => inventoryByProductAndSize[code][size] > 0);
        })
        .map(code => ({ 
          label: code,
          value: code 
        }));
      
      setProductOptions(productOpts);
      setSizeOptions(sizeOpts);
      setInventoryQuantities(inventoryByProductAndSize);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const checkExistingCustomer = async (phone) => {
    if (phone.length === 10) {
      try {
        const { data, error } = await supabase
          .from('Customers')
          .select('Name')
          .eq('Phone Number', phone)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Supabase error:', error);
          return;
        }
        
        if (data && data.Name) {
          setCustomer(prev => ({ ...prev, name: data.Name || '', isExisting: true }));
        } else {
          setCustomer(prev => ({ ...prev, name: '', isExisting: false }));
        }
      } catch (error) {
        console.error('Error checking customer:', error);
      }
    } else {
      setCustomer(prev => ({ ...prev, name: '', isExisting: false }));
    }
  };

  const calculateAvailableQuantity = (product_code, size, currentIndex) => {
    if (!product_code || !size || !inventoryQuantities[product_code] || !inventoryQuantities[product_code][size]) {
      return 0;
    }
    
    const totalInventory = inventoryQuantities[product_code][size] || 0;
    const allocatedQuantity = billItems.reduce((sum, item, idx) => {
      if (idx !== currentIndex && item.product_code === product_code && item.size === size) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
    
    return Math.max(0, totalInventory - allocatedQuantity);
  };

  const handleBillItemChange = (index, field, value) => {
    const newBillItems = [...billItems];
    
    const updateItemPrices = (item) => {
      // Calculate selling price based on MRP and discount
      const sellingPrice = calculateSellingPrice(item);
      item.sellingPrice = sellingPrice;
      // Total is selling price multiplied by quantity
      item.total = sellingPrice * item.quantity;
    };
    
    if (field === 'product_code') {
      newBillItems[index].product_code = value;
      newBillItems[index].size = '';
      newBillItems[index].mrp = 0;
      newBillItems[index].quantity = 1;
      newBillItems[index].total = 0;
      newBillItems[index].availableQuantity = 0;
    }
    else if (field === 'size') {
      newBillItems[index].size = value;
      const product_code = newBillItems[index].product_code;
      
      if (product_code && value) {
        const product = products.find(p => p.code.toString() === product_code);
        if (product) {
          newBillItems[index].mrp = product.mrp || 0;
          const availableQty = calculateAvailableQuantity(product_code, value, index);
          newBillItems[index].availableQuantity = availableQty;
          if (newBillItems[index].quantity > availableQty) {
            newBillItems[index].quantity = Math.max(1, availableQty);
          }
          const sellingPrice = calculateSellingPrice(newBillItems[index]);
          newBillItems[index].sellingPrice = sellingPrice;
          newBillItems[index].total = sellingPrice * newBillItems[index].quantity;
        }
      }
    }
    else if (field === 'discount') {
      // Update discount while preserving existing quantity
      newBillItems[index].discount = value;
      const sellingPrice = calculateSellingPrice(newBillItems[index]);
      newBillItems[index].sellingPrice = sellingPrice;
      newBillItems[index].total = sellingPrice * newBillItems[index].quantity;
    }
    else if (field === 'quantity') {
      const product_code = newBillItems[index].product_code;
      const size = newBillItems[index].size;
      
      if (product_code && size) {
        const availableQty = calculateAvailableQuantity(product_code, size, index);
        newBillItems[index].availableQuantity = availableQty;
        
        if (value === 0 || value === '') {
          newBillItems[index].quantity = 0;
        } else {
          const limitedValue = Math.min(value, availableQty);
          newBillItems[index].quantity = limitedValue >= 0 ? limitedValue : 0;
        }
        
        // Calculate total with existing discount
        const sellingPrice = calculateSellingPrice(newBillItems[index]);
        newBillItems[index].sellingPrice = sellingPrice;
        newBillItems[index].total = sellingPrice * newBillItems[index].quantity;
        
        newBillItems.forEach((item, idx) => {
          if (idx !== index && item.product_code === product_code && item.size === size) {
            item.availableQuantity = calculateAvailableQuantity(item.product_code, item.size, idx);
            if (item.quantity > item.availableQuantity && item.availableQuantity > 0) {
              item.quantity = item.availableQuantity;
              // Recalculate total with existing discount
              const itemSellingPrice = calculateSellingPrice(item);
              item.sellingPrice = itemSellingPrice;
              item.total = itemSellingPrice * item.quantity;
            }
          }
        });
      } else {
        newBillItems[index].quantity = value;
        // Calculate total with existing discount
        const sellingPrice = calculateSellingPrice(newBillItems[index]);
        newBillItems[index].sellingPrice = sellingPrice;
        newBillItems[index].total = sellingPrice * value;
      }
    }

    setBillItems(newBillItems);
  };

  const getAvailableSizes = (productCode) => {
    return sizeOptions[productCode] || [];
  };

  const calculateSellingPrice = (item) => {
    if (!item.discount || !item.discount.value) return item.mrp;
    
    if (item.discount.type === 'percentage') {
      // Calculate per-unit price after percentage discount
      const percentage = Math.min(item.discount.value, 100);
      return item.mrp - (item.mrp * percentage / 100);
    } else {
      // Fixed amount discount is applied directly to MRP
      return Math.max(0, item.mrp - item.discount.value);
    }
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discount.type === 'percentage') {
      return (subtotal * discount.value) / 100;
    }
    return discount.value;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount();
  };

  const calculateRemaining = () => {
    const totalBill = calculateTotal();
    const totalPaid = payment.upi + payment.cash + payment.payLater;
    return Math.round((totalBill - totalPaid) * 100) / 100;
  };

  const addBillItem = () => {
    setBillItems([
      ...billItems, 
      { 
        id: billItems.length + 1, 
        product_code: '', 
        size: '', 
        mrp: 0, 
        quantity: 1, 
        discount: { type: 'percentage', value: 0 },
        total: 0,
        availableQuantity: 0
      }
    ]);
  };

  const removeBillItem = (index) => {
    setBillItems(prevItems => {
      const newItems = [...prevItems];
      // Remove the item at the specified index
      newItems.splice(index, 1);
      
      // If this was the last item, add a new empty item
      if (newItems.length === 0) {
        newItems.push({
          id: 1,
          product_code: '',
          size: '',
          mrp: 0,
          quantity: 1,
          discount: { type: 'percentage', value: 0 },
          sellingPrice: 0,
          total: 0,
          availableQuantity: 0
        });
      } else {
        // Update ids to be sequential
        newItems.forEach((item, idx) => {
          item.id = idx + 1;
        });
      }
      return newItems;
    });
  };

  const handlePrintBill = async () => {
    if (!customer.isExisting && customer.phone.length === 10 && customer.name && customer.name.trim()) {
      try {
        const { data: existingCustomer, error: checkError } = await supabase
          .from('Customers')
          .select('*')
          .eq('Phone Number', customer.phone)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing customer:', checkError);
          throw checkError;
        }

        if (!existingCustomer) {
          const { error } = await supabase
            .from('Customers')
            .insert({
              'Phone Number': customer.phone,
              'Name': customer.name.trim()
            });
          
          if (error) {
            throw error;
          }
        }
        
        setCustomer(prev => ({ ...prev, isExisting: true }));
      } catch (error) {
        console.error('Error saving customer:', error);
        alert('Failed to save customer information: ' + error.message);
        return;
      }
    }
    
    window.print();

    setTimeout(() => {
      setCustomer({
        phone: '',
        name: '',
        isExisting: false
      });

      setBillItems([
        { 
          id: 1, 
          product_code: '', 
          size: '', 
          mrp: 0, 
          quantity: 1, 
          total: 0,
          availableQuantity: 0
        }
      ]);

      setDiscount({
        type: 'percentage',
        value: 0
      });

      setPayment({
        upi: 0,
        cash: 0,
        payLater: 0
      });
    }, 100);
  };

  return (
    <div className="p-6 pb-24">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Create Bill</h1>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="w-full p-2 border rounded-md"
                  value={customer.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCustomer(prev => ({...prev, phone: value}));
                    checkExistingCustomer(value);
                  }}
                  placeholder="Enter 10-digit phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className={`w-full p-2 border rounded-md ${customer.isExisting ? 'bg-gray-100' : ''}`}
                  value={customer.name}
                  onChange={(e) => !customer.isExisting && setCustomer({...customer, name: e.target.value})}
                  disabled={customer.isExisting}
                  placeholder="Enter customer name"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-center font-medium border">Product</th>
                  <th className="p-2 text-center font-medium border">Size</th>
                  <th className="p-2 text-center font-medium border">MRP (₹)</th>
                  <th className="p-2 text-center font-medium border">Quantity</th>
                  <th className="p-2 text-center font-medium border">Discount Type</th>
                  <th className="p-2 text-center font-medium border">Discount</th>
                  <th className="p-2 text-center font-medium border">Available</th>
                  <th className="p-2 text-center font-medium border">Selling Price (₹)</th>
                  <th className="p-2 text-center font-medium border">Total (₹)</th>
                  <th className="p-2 text-center font-medium border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border text-center">
                      <SearchableDropdown
                        value={item.product_code ? productOptions.find(p => p.value === item.product_code) : null}
                        onChange={(selected) => {
                          const value = typeof selected === 'string' ? selected : (selected ? selected.value : '');
                          handleBillItemChange(index, 'product_code', value);
                        }}
                        options={productOptions}
                        placeholder="Select product"
                        className="w-full text-left"
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <SearchableDropdown
                        value={item.size ? { label: item.size.split(' ')[0], value: item.size.split(' ')[0] } : null}
                        onChange={(selected) => {
                          const value = typeof selected === 'string' ? selected : (selected ? selected.value : '');
                          handleBillItemChange(index, 'size', value);
                        }}
                        options={getAvailableSizes(item.product_code).map(size => ({ 
                          label: size, 
                          value: size 
                        }))}
                        placeholder="Select size"
                        className="w-full text-left"
                        disabled={!item.product_code}
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <div className="text-center py-2">₹{item.mrp}</div>
                    </td>
                    <td className="p-2 border text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.availableQuantity || 1}
                        className="w-full p-2 border rounded no-spinner text-center"
                        value={item.quantity}
                        onChange={(e) => handleBillItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 border text-center">
                      <select
                        className="w-full p-2 border rounded text-center"
                        value={item.discount.type}
                        onChange={(e) => handleBillItemChange(index, 'discount', { 
                          ...item.discount, 
                          type: e.target.value,
                          value: e.target.value === 'percentage' ? Math.min(item.discount.value, 100) : Math.min(item.discount.value, item.mrp)
                        })}
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">₹</option>
                      </select>
                    </td>
                    <td className="p-2 border text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.discount.type === 'percentage' ? 100 : item.mrp}
                        step={item.discount.type === 'percentage' ? 1 : 0.01}
                        className="w-full p-2 border rounded no-spinner text-center"
                        value={item.discount.value}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value) || 0;
                          const maxValue = item.discount.type === 'percentage' ? 100 : item.mrp;
                          handleBillItemChange(index, 'discount', { 
                            ...item.discount, 
                            value: Math.min(newValue, maxValue)
                          });
                        }}
                      />
                    </td>
                    <td className="p-2 border text-center text-sm text-gray-600">
                      {item.availableQuantity > 0 ? item.availableQuantity : '-'}
                    </td>
                    <td className="p-2 border text-center">
                      ₹{(item.total / item.quantity).toFixed(2)}
                    </td>
                    <td className="p-2 border text-center">
                      ₹{item.total.toFixed(2)}
                    </td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => removeBillItem(index)}
                        className="rounded px-3 py-1.5 text-red-500 hover:text-white hover:bg-red-500 transition-colors duration-200"
                        title="Remove this item"
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addBillItem}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Item
          </button>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Discount</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="percentage"
                  name="discountType"
                  checked={discount.type === 'percentage'}
                  onChange={() => setDiscount({...discount, type: 'percentage'})}
                  className="mr-2"
                />
                <label htmlFor="percentage">Percentage (%)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="amount"
                  name="discountType"
                  checked={discount.type === 'amount'}
                  onChange={() => setDiscount({...discount, type: 'amount'})}
                  className="mr-2"
                />
                <label htmlFor="amount">Amount (₹)</label>
              </div>
              <input
                type="number"
                min="0"
                className="p-2 border rounded-md w-32"
                value={discount.value || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : 0;
                  setDiscount({...discount, value: value});
                }}
              />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Bill Summary</h2>
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Discount ({
                discount.type === 'percentage' 
                  ? `${discount.value}%` 
                  : calculateSubtotal() > 0
                    ? `${((discount.value / calculateSubtotal()) * 100).toFixed(2)}%`
                    : '0%'
              }):</span>
              <span>₹{calculateDiscountAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Payment Mode</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 border rounded-md"
                    value={payment.upi || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : 0;
                      setPayment({ ...payment, upi: value });
                    }}
                    placeholder="Enter UPI amount"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-2 border rounded-md"
                    value={payment.cash || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : 0;
                      setPayment({ ...payment, cash: value });
                    }}
                    placeholder="Enter cash amount"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Later Amount</label>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded-md"
                  value={payment.payLater || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : 0;
                    setPayment({ ...payment, payLater: value });
                  }}
                  placeholder="Enter pay later amount"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-md">
              <div className="flex justify-between items-center text-sm">
                <span>Total Bill Amount:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Total Paid (UPI + Cash):</span>
                <span>₹{(payment.upi + payment.cash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Pay Later Amount:</span>
                <span>₹{payment.payLater.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-bold mt-2 pt-2 border-t">
                <span>Remaining Balance:</span>
                <span className={calculateRemaining() === 0 ? 'text-green-600' : 'text-red-600'}>
                  ₹{calculateRemaining().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePrintBill}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={
              calculateRemaining() !== 0 || 
              !customer.phone || 
              customer.phone.length !== 10 || 
              !customer.name.trim() ||
              !billItems.some(item => item.product_code && item.size && item.quantity > 0)
            }
            title={
              !customer.phone || customer.phone.length !== 10 
                ? "Please enter a valid 10-digit phone number" 
                : !customer.name.trim() 
                  ? "Please enter customer name"
                  : !billItems.some(item => item.product_code && item.size && item.quantity > 0)
                    ? "Please select at least one product with size and quantity"
                    : calculateRemaining() !== 0 
                      ? "Please ensure payment equals total bill amount"
                      : ""
            }
          >
            Print Bill
          </button>
        </div>
      </div>
      
      <style type="text/css" media="print">{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white.rounded-lg.shadow-md.p-6, .bg-white.rounded-lg.shadow-md.p-6 * {
            visibility: visible;
          }
          .bg-white.rounded-lg.shadow-md.p-6 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background-color: white !important;
            color: black !important;
          }
          button, .actions-column {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
