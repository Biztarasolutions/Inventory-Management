import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SearchableDropdown from './SearchableDropdown';

const CreateBill = () => {
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
  const [inventoryQuantities, setInventoryQuantities] = useState({});
  const [sizeOptions, setSizeOptions] = useState({});

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const [inventoryData, productsData] = await Promise.all([
        supabase.from('inventory').select('*'),
        supabase.from('products').select('*')
      ]);

      if (inventoryData.error) {
        console.error('Error fetching inventory:', inventoryData.error);
        return;
      }
      if (productsData.error) {
        console.error('Error fetching products:', productsData.error);
        return;
      }

      const inventoryItems = inventoryData.data || [];
      const productItems = productsData.data || [];
      
      console.log('Products data:', productItems);
      console.log('Inventory data:', inventoryItems);
      
      if (!productItems.length || !inventoryItems.length) {
        console.log('No data received');
        return;
      }

      setProducts(productItems);
      
      // Calculate inventory quantities by product code and size
      const inventoryByProductAndSize = {};
      const productCodesWithInventory = new Set();
      const sizeOpts = {};
      
      // Process inventory data to calculate available quantities
      inventoryItems.forEach(item => {
        const product = productItems.find(p => p.id === item.product_id);
        if (product) {
          const productCode = product.code.toString();
          const size = item.size;
          const quantity = item.quantity || 0;
          
          productCodesWithInventory.add(productCode);
          
          // Initialize product entry if it doesn't exist
          if (!inventoryByProductAndSize[productCode]) {
            inventoryByProductAndSize[productCode] = {};
          }
          
          // Initialize size entry if it doesn't exist
          if (!inventoryByProductAndSize[productCode][size]) {
            inventoryByProductAndSize[productCode][size] = 0;
          }
          
          // Add size to options if not already present
          if (!sizeOpts[productCode]) {
            sizeOpts[productCode] = new Set();
          }
          sizeOpts[productCode].add(size);
          
          // Add quantity
          inventoryByProductAndSize[productCode][size] += quantity;
        }
      });

      // Convert size Sets to arrays
      Object.keys(sizeOpts).forEach(code => {
        sizeOpts[code] = Array.from(sizeOpts[code]);
      });
      
      // Create product options array for dropdown
      const productOpts = Array.from(productCodesWithInventory)
        .filter(code => {
          // Check if any size has positive inventory
          const sizes = Object.keys(inventoryByProductAndSize[code] || {});
          return sizes.some(size => inventoryByProductAndSize[code][size] > 0);
        })
        .map(code => { 
          const product = productItems.find(p => p.code.toString() === code);
          return {
            label: code + (product?.style_code ? ` - ${product.style_code}` : ''),
            value: code 
          };
        });

      console.log('Product options:', productOpts);
      console.log('Size options:', sizeOpts);
      console.log('Inventory quantities:', inventoryByProductAndSize);
      
      setProductOptions(productOpts);
      setSizeOptions(sizeOpts);
      setInventoryQuantities(inventoryByProductAndSize);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

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

  const calculateMRPTotal = () => {
    return billItems.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscountAmount = () => {
    const mrpTotal = calculateMRPTotal();
    const finalTotal = calculateSubtotal();
    return mrpTotal - finalTotal;
  };

  // New additional discount calculation
  const calculateAdditionalDiscount = () => {
    if (discount.type === 'amount') {
      return discount.value;
    } else {
      // percentage: (Total MRP - item discount) * discount.value / 100
      const mrpTotal = calculateMRPTotal();
      const itemDiscount = calculateDiscountAmount();
      return (mrpTotal - itemDiscount) * discount.value / 100;
    }
  };

  // New total calculation using new additional discount
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - calculateAdditionalDiscount());
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
    try {
      // First get the next order number
      const { data: lastOrder, error: lastOrderError } = await supabase
        .from('Orders')
        .select('order_no')
        .order('order_no', { ascending: false })
        .limit(1)
        .single();

      if (lastOrderError && lastOrderError.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching last order number:', lastOrderError);
        throw lastOrderError;
      }

      const nextOrderNo = lastOrder ? parseInt(lastOrder.order_no) + 1 : 123451;

      // Handle customer creation/verification
      if (!customer.isExisting && customer.phone.length === 10 && customer.name && customer.name.trim()) {
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
      }

      // Prepare order data
      const orderData = billItems.map(item => ({
        order_no: nextOrderNo,
        customer_name: customer.name,
        phone_number: customer.phone,
        product: item.product_code,
        size: item.size,
        mrp: item.mrp,
        quantity: item.quantity,
        discount_type: item.discount.type,
        discount: item.discount.value,
        selling_price: item.total / item.quantity,
        total: item.total,
  order_discount_type: discount.type,
  order_discount: discount.value,
        order_amount: calculateTotal(),
        upi_amount: payment.upi,
        cash_amount: payment.cash,
        pay_later: payment.payLater,
        created_at: new Date().toISOString()
      }));

      // Save order data to Supabase
      const { error: orderError } = await supabase
        .from('Orders')
        .insert(orderData);

      if (orderError) {
        console.error('Error saving order:', orderError);
        throw orderError;
      }

      // Add entries to stock history for each purchased item
      const stockHistoryEntries = billItems.map(item => {
        const product = products.find(p => p.code.toString() === item.product_code);
        return {
          product_id: product?.id,
          size: item.size,
          quantity: -item.quantity, // Negative quantity because stock is being reduced
          date: new Date().toISOString(),
          note: `Order #${nextOrderNo} - ${customer.name}`,
          action: 'sold' // Explicitly mark as sold instead of removed
        };
      });

      // First, get current inventory for all products being sold
      const promises = billItems.map(async (item) => {
        const { data: currentInventory, error: invError } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product_code)
          .eq('size', item.size)
          .gt('quantity', 0)  // Only get entries with positive quantity
          .order('date', { ascending: true });  // Get oldest entries first (FIFO)

        if (invError) {
          console.error('Error fetching inventory:', invError);
          throw invError;
        }

        return { item, currentInventory: currentInventory || [] };
      });

      const inventoryData = await Promise.all(promises);

      // Update existing inventory entries and create history entries
      for (const data of inventoryData) {
  if (!data) continue;
  const { item, currentInventory } = data;
  let remainingQuantity = item.quantity;

        // Update existing inventory entries
        for (const inv of currentInventory) {
          if (remainingQuantity <= 0) break;

          const deductQuantity = Math.min(remainingQuantity, inv.quantity);
          const newQuantity = inv.quantity - deductQuantity;

          // Update the inventory entry
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', inv.id);

          if (updateError) {
            console.error('Error updating inventory:', updateError);
            throw updateError;
          }

          remainingQuantity -= deductQuantity;
        }
      }

      // Add entries to stock history
      const { error: stockHistoryError } = await supabase
        .from('inventory')
        .insert(stockHistoryEntries);

      if (stockHistoryError) {
        console.error('Error updating stock history:', stockHistoryError);
        throw stockHistoryError;
      }
      
      // Print the bill after saving
      window.print();
    } catch (error) {
      console.error('Error processing bill:', error);
      alert('Failed to save order information: ' + error.message);
      return;
    }

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
          discount: { type: 'percentage', value: 0 },
          sellingPrice: 0,
          total: 0,
          availableQuantity: 0
        }
      ]);



      setPayment({
        upi: 0,
        cash: 0,
        payLater: 0
      });

      setDiscount({
        type: 'percentage',
        value: 0
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
                        onKeyDown={(e) => {
                          // Prevent scrolling from changing the value
                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                          }
                        }}
                        onWheel={(e) => e.target.blur()} // Prevent scroll from changing value
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
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
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

          <div className="bg-gray-50 p-4 rounded-md mt-4">
            <h2 className="text-lg font-semibold mb-3">Order Discount</h2>
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
                max={discount.type === 'percentage' ? 100 : undefined}
                step={discount.type === 'percentage' ? 1 : 0.01}
                className="p-2 border rounded-md w-32"
                value={discount.value || ''}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                  }
                }}
                onWheel={(e) => e.target.blur()}
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
              <span>Total MRP:</span>
              <span>₹{calculateMRPTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Item Discounts ({
                calculateMRPTotal() > 0
                  ? `${((calculateDiscountAmount() / calculateMRPTotal()) * 100).toFixed(2)}%`
                  : '0%'
              }):</span>
              <span>-₹{calculateDiscountAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Order Discount(%)</span>
              <span>-₹{calculateAdditionalDiscount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Order Amount:</span>
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
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
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
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => e.target.blur()}
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
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                    }
                  }}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    const value = e.target.value ? parseFloat(e.target.value) : 0;
                    setPayment({ ...payment, payLater: value });
                  }}
                  placeholder="Enter pay later amount"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded-md">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Order Amount:</span>
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
                      ? "Please ensure payment equals total order amount"
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
};

export default CreateBill;
