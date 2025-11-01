import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateTime } from '../App';
import SearchableDropdown from './SearchableDropdown';

const CreateBill = () => {
  const [customer, setCustomer] = useState({
    phone: '',
    name: '',
    isExisting: false
  });
  // tracks what the user typed in the customer dropdown (raw)
  // eslint-disable-next-line no-unused-vars
  const [customerInputRaw, setCustomerInputRaw] = useState('');
  // 'name' | 'phone' | 'unknown' | 'selected' - controls which secondary input to show
  const [customerInputType, setCustomerInputType] = useState('unknown');
  const customerNameRef = useRef(null);
  const customerPhoneRef = useRef(null);
  // raw timestamp of last order (ISO) — we'll render a relative time like "2 days ago"
  const [lastOrderAt, setLastOrderAt] = useState(null);

  // return relative time like 'just now', '5 minutes ago', '2 days ago'
  const timeAgo = (isoString) => {
    if (!isoString) return null;
    try {
      const now = new Date();
      const then = new Date(isoString);
      const diffMs = now - then;
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 10) return 'just now';
      if (seconds < 60) return `${seconds} seconds ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
      const years = Math.floor(months / 12);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    } catch (err) {
      return null;
    }
  };

  // Called when user confirms the secondary input (name or phone) after typing in the dropdown
  const confirmCustomerFromSecondary = () => {
    // Only confirm when both name and a valid 10-digit phone are present.
    const phoneStr = customer.phone ? String(customer.phone).replace(/\D/g, '') : '';
    const nameStr = customer.name ? String(customer.name).trim() : '';
    if (nameStr && phoneStr.length === 10) {
      setCustomerInputRaw('');
      setCustomerInputType('selected');
      // Check existing customer to possibly mark isExisting and fetch last order
      checkExistingCustomer(phoneStr);
    } else {
      // If incomplete, keep the secondary inputs visible so user can finish entry
      // Optionally we could show a small validation tooltip here in future.
      // For now, do nothing.
    }
  };

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
  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerDropdownCloseTrigger, setCustomerDropdownCloseTrigger] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const inventoryData = await supabase.from('inventory').select('*');

      if (inventoryData.error) {
        console.error('Error fetching inventory:', inventoryData.error);
        return;
      }

      const inventoryItems = inventoryData.data || [];
      
      console.log('Inventory data:', inventoryItems);
      
      if (!inventoryItems.length) {
        console.log('No inventory data received');
        return;
      }

      // Calculate inventory quantities by product and size
      const inventoryByProductAndSize = {};
      const productsWithInventory = new Set();
      const sizeOpts = {};
      const productMrpMap = {};
      
      // Process inventory data to calculate available quantities
      inventoryItems.forEach(item => {
        const productName = item.product;
        const size = item.size;
        const quantity = item.quantity || 0;
        const action = item.action;

        if (!productName || !size) return;

        // Store MRP for this product
        if (item.mrp && !productMrpMap[productName]) {
          productMrpMap[productName] = item.mrp;
        }
        
        // Initialize product entry if it doesn't exist
        if (!inventoryByProductAndSize[productName]) {
          inventoryByProductAndSize[productName] = {};
        }
        
        // Initialize size entry if it doesn't exist
        if (!inventoryByProductAndSize[productName][size]) {
          inventoryByProductAndSize[productName][size] = 0;
        }
        
        // Add or subtract quantity based on action
        if (action === 'added') {
          inventoryByProductAndSize[productName][size] += Math.abs(quantity);
        } else if (action === 'deleted' || action === 'sold') {
          inventoryByProductAndSize[productName][size] -= Math.abs(quantity);
        }
        
        // Add to products with inventory if quantity is positive
        if (inventoryByProductAndSize[productName][size] > 0) {
          productsWithInventory.add(productName);
          
          // Add size to options
          if (!sizeOpts[productName]) {
            sizeOpts[productName] = new Set();
          }
          sizeOpts[productName].add(size);
        }
      });

      // Convert size Sets to arrays and filter out sizes with zero or negative inventory
      Object.keys(sizeOpts).forEach(productName => {
        sizeOpts[productName] = Array.from(sizeOpts[productName]).filter(size => 
          inventoryByProductAndSize[productName][size] > 0
        );
      });
      
      // Create product options array for dropdown (only products with positive inventory)
      const productOpts = Array.from(productsWithInventory)
        .filter(productName => {
          // Check if any size has positive inventory
          const sizes = Object.keys(inventoryByProductAndSize[productName] || {});
          return sizes.some(size => inventoryByProductAndSize[productName][size] > 0);
        })
        .map(productName => ({
          label: productName,
          value: productName,
          mrp: productMrpMap[productName] || 0
        }));

      console.log('Product options:', productOpts);
      console.log('Size options:', sizeOpts);
      console.log('Inventory quantities:', inventoryByProductAndSize);
      console.log('Product MRP map:', productMrpMap);
      
      setProducts(productOpts);
      setProductOptions(productOpts);
      setSizeOptions(sizeOpts);
      setInventoryQuantities(inventoryByProductAndSize);

      // fetch customer options for customer dropdown
      try {
        const { data: customersData, error: customersError } = await supabase
          .from('Customers')
          .select('Name, "Phone Number"');
        if (!customersError && Array.isArray(customersData)) {
          const opts = customersData.map(c => ({
            label: `${c.Name || ''} — ${c['Phone Number'] || ''}`,
            value: c['Phone Number'] || ''
          }));
          setCustomerOptions(opts);
        } else {
          setCustomerOptions([]);
        }
      } catch (err) {
        console.error('Error fetching customers for dropdown:', err);
        setCustomerOptions([]);
      }

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
          // existing customer found — overwrite name with canonical value and mark existing
          setCustomer(prev => ({ ...prev, name: data.Name || '', isExisting: true }));
          // Fetch latest order for this phone
          try {
            const { data: lastOrder, error: lastOrderError } = await supabase
              .from('Orders')
              .select('created_at')
              .eq('phone_number', phone)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastOrderError && lastOrderError.code !== 'PGRST116') {
              console.error('Error fetching last order:', lastOrderError);
              setLastOrderAt(null);
            } else if (lastOrder && lastOrder.created_at) {
              // store raw ISO timestamp and render relative time in UI
              setLastOrderAt(lastOrder.created_at);
            } else {
              setLastOrderAt(null);
            }
          } catch (err) {
            console.error('Error fetching last order:', err);
            setLastOrderAt(null);
          }
        } else {
          // no existing customer — keep any name the user may have typed and mark as new
          setCustomer(prev => ({ ...prev, isExisting: false }));
          setLastOrderAt(null);
        }
      } catch (error) {
        console.error('Error checking customer:', error);
      }
    } else {
      // Phone not complete yet — keep any typed name and keep as not-existing
      setCustomer(prev => ({ ...prev, isExisting: false }));
      setLastOrderAt(null);
    }
  };

  const calculateAvailableQuantity = (product, size, currentIndex) => {
    if (!product || !size || !inventoryQuantities[product] || !inventoryQuantities[product][size]) {
      return 0;
    }
    
    const totalInventory = inventoryQuantities[product][size] || 0;
    const allocatedQuantity = billItems.reduce((sum, item, idx) => {
      if (idx !== currentIndex && item.product_code === product && item.size === size) {
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
      
      // Set MRP from the selected product
      const product = products.find(p => p.value === value);
      if (product) {
        newBillItems[index].mrp = product.mrp || 0;
      }
    }
    else if (field === 'size') {
      newBillItems[index].size = value;
      const product = newBillItems[index].product_code;
      
      if (product && value) {
        const availableQty = calculateAvailableQuantity(product, value, index);
        newBillItems[index].availableQuantity = availableQty;
        if (newBillItems[index].quantity > availableQty) {
          newBillItems[index].quantity = Math.max(1, availableQty);
        }
        const sellingPrice = calculateSellingPrice(newBillItems[index]);
        newBillItems[index].sellingPrice = sellingPrice;
        newBillItems[index].total = sellingPrice * newBillItems[index].quantity;
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
      const product = newBillItems[index].product_code;
      const size = newBillItems[index].size;
      
      if (product && size) {
        const availableQty = calculateAvailableQuantity(product, size, index);
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
          if (idx !== index && item.product_code === product && item.size === size) {
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

  const getAvailableSizes = (product) => {
    // Return only sizes that currently have positive inventory for the given product
    const sizes = sizeOptions[product] || [];
    if (!inventoryQuantities[product]) return [];
    return sizes.filter(s => (inventoryQuantities[product][s] || 0) > 0);
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

  // Print bill only - no data saving
  const handlePrintBill = () => {
    window.print();
  };

  // Place order - save data and reset form
  const handlePlaceOrder = async () => {
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
              'Phone Number': Number(customer.phone) || customer.phone,
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
        phone_number: Number(customer.phone) || customer.phone,
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
        const product = products.find(p => p.value === item.product_code);
        return {
          product: item.product_code, // Store product name directly
          mrp: item.mrp,
          image: product?.image || null,
          size: item.size,
          quantity: item.quantity, // Positive quantity for sold items
          date: new Date().toISOString(),
          note: `Order #${nextOrderNo} - ${customer.name}`,
          action: 'sold' // Explicitly mark as sold
        };
      });

      // First, get current inventory for all products being sold
      const promises = billItems.map(async (item) => {
        const { data: currentInventory, error: invError } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product', item.product_code) // Use product field instead of product_id
          .eq('size', item.size)
          .eq('action', 'added') // Only get added inventory entries
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
      
      // Order saved successfully
      alert('Order placed successfully!');
      
      // Reset form after successful order
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
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to save order information: ' + error.message);
      return;
    }
  };

  // Cancel order - reset form without saving
  const handleCancelOrder = () => {
    setShowCancelDialog(true);
  };

  const confirmCancelOrder = () => {
    // Reset all form data
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

    // Reset customer input type and last order info
    setCustomerInputType('none');
    setLastOrderAt(null);
    setShowCancelDialog(false);
  };

  const closeCancelDialog = () => {
    setShowCancelDialog(false);
  };

  return (
    <div className="p-6 pb-24">
      <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold">Create Bill</h1>
                {lastOrderAt && (customer.phone || customer.name) ? (
                  <div className="text-right ml-4" title={formatDateTime(lastOrderAt)}>
                    <div className="text-sm text-gray-500">Last Order</div>
                    <div className="text-sm font-medium text-gray-700">{timeAgo(lastOrderAt)}</div>
                  </div>
                ) : null}
              </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <SearchableDropdown
                  value={
                    // Only treat a value as "selected" when the input flow indicates selection.
                    // While the user is typing (name-first or phone-first) we keep the value null
                    // so the dropdown's internal value-change effect doesn't close the floating panel.
                    (customerInputType === 'selected' || customer.isExisting) ? (
                      customer.name && !customer.phone
                        ? { label: customer.name, value: customer.name }
                        : customer.phone
                          ? { label: customer.name ? `${customer.name} — ${customer.phone}` : customer.phone, value: customer.phone }
                          : null
                    ) : null
                  }
                  onOpen={() => {
                    // If an existing customer is selected but user clicks the field to edit,
                    // clear the existing-selection flag and allow typing a new value.
                    if (customer.isExisting) {
                      setCustomer(prev => ({ ...prev, isExisting: false, phone: '', name: '' }));
                      setCustomerInputType('unknown');
                      setCustomerInputRaw('');
                      setLastOrderAt(null);
                    }
                  }}
                  onChange={(selected) => {
                    const rawVal = typeof selected === 'string' ? selected : (selected ? selected.value : '');
                    const val = rawVal == null ? '' : String(rawVal);
                    const label = (selected && typeof selected === 'object' && selected.label) ? selected.label : '';
                    if (label && label.includes('—')) {
                      const parts = label.split('—').map(s => s.trim());
                      // Normalize phone to digits and use last 10 digits if country code present
                      const digits = val.replace(/\D/g, '');
                      const phoneToUse = digits.length >= 10 ? digits.slice(-10) : digits;
                      setCustomer({ phone: phoneToUse, name: parts[0] || '', isExisting: !!val });
                      setCustomerInputType('selected');
                      setCustomerInputRaw('');
                      if (phoneToUse && phoneToUse.length === 10) checkExistingCustomer(phoneToUse);
                    } else {
                      // If user selected a custom option (string)
                      const raw = val || '';
                      setCustomerInputRaw(raw);
                      const hasLetter = /[A-Za-z]/.test(raw);
                      const onlyDigits = /^\d+$/.test(raw);
                      if (hasLetter) {
                        // treat as name entered first
                        setCustomer({ phone: '', name: raw, isExisting: false });
                        setCustomerInputType('name');
                        setTimeout(() => { if (customerPhoneRef.current) customerPhoneRef.current.focus(); }, 0);
                      } else if (onlyDigits && raw.length === 10) {
                        // treat as full phone entered first
                        setCustomer({ phone: raw, name: '', isExisting: false });
                        setCustomerInputType('phone');
                        // trigger the dropdown to close (SearchableDropdown will respond to this)
                        setCustomerDropdownCloseTrigger(prev => prev + 1);
                        // slight delay to allow dropdown to close before focusing the name field
                        setTimeout(() => { if (customerNameRef.current) customerNameRef.current.focus(); }, 120);
                        checkExistingCustomer(raw);
                      } else {
                        // unknown/partial — keep raw in phone field but show both
                        setCustomer(prev => ({ ...prev, phone: raw.replace(/\D/g, ''), isExisting: false }));
                        setCustomerInputType('unknown');
                      }
                    }
                  }}
                  options={customerOptions}
                  placeholder="Select or type"
                  allowCustomInput={true}
                  onInputChange={(input) => {
                    const raw = input || '';
                    setCustomerInputRaw(raw);
                    const onlyDigits = /^\d+$/.test(raw);
                    // Auto-detect phone when user types a full 10-digit number — keep name-typing passive until explicit Add
                    if (onlyDigits && raw.length === 10) {
                      setCustomer({ phone: raw, name: '', isExisting: false });
                      setCustomerInputType('phone');
                      setCustomerDropdownCloseTrigger(prev => prev + 1);
                      // allow dropdown to close (see SearchableDropdown effect) then focus
                      setTimeout(() => { if (customerNameRef.current) customerNameRef.current.focus(); }, 120);
                      checkExistingCustomer(raw);
                    } else {
                      // otherwise remain passive (don't convert text into customer name until user confirms Add)
                      setCustomer(prev => ({ ...prev, phone: raw.replace(/\D/g, '') }));
                      setCustomerInputType('unknown');
                    }
                  }}
                  closeTrigger={customerDropdownCloseTrigger}
                />
              </div>
              {/* Secondary input: show Name or Phone depending on what user typed in the customer dropdown */}
              {customer.isExisting ? null : customerInputType === 'name' ? (
                <div>
                  {/* Show the entered name above the phone input so user sees what they typed */}
                  <div className="mb-2 text-sm text-gray-700">
                    <div className="text-xs text-gray-500">Name</div>
                    <div className="font-medium">{customer.name || '-'}</div>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    ref={customerPhoneRef}
                    type="text"
                    pattern="[0-9]*"
                    maxLength={10}
                    className="w-full p-2 border rounded-md"
                    value={customer.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setCustomer(prev => ({ ...prev, phone: value }));
                      if (value.length === 10) checkExistingCustomer(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        confirmCustomerFromSecondary();
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
              ) : customerInputType === 'phone' ? (
                <div>
                  {/* Show the entered phone above the name input so user sees what they typed */}
                  <div className="mb-2 text-sm text-gray-700">
                    <div className="text-xs text-gray-500">Phone Number</div>
                    <div className="font-medium">{customer.phone ? (customer.phone.length === 10 ? `+91 ${customer.phone}` : customer.phone) : '-'}</div>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    ref={customerNameRef}
                    type="text"
                    className="w-full p-2 border rounded-md"
                    value={customer.name}
                    onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        confirmCustomerFromSecondary();
                      }
                    }}
                    placeholder="Enter customer name"
                  />
                </div>
              ) : (
                // unknown: do not show secondary inputs until user types/selects a customer
                null
              )}
              {/* removed duplicate last-order display (header shows it now) */}
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

          {/* Print Bill Button - Above Payment Mode */}
          <div className="flex justify-center">
            <button
              onClick={handlePrintBill}
              className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={
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
                      : "Print bill without saving order"
              }
            >
              Print Bill
            </button>
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

            {/* Order Action Buttons */}
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={handleCancelOrder}
                className="bg-red-600 text-white py-2 px-6 rounded hover:bg-red-700"
                title="Cancel order and reset all data"
              >
                Cancel Order
              </button>
              
              <button
                onClick={handlePlaceOrder}
                className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                          : "Place order and save to database"
                }
              >
                Place Order
              </button>
            </div>
          </div>
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

      {/* Cancel Order Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Order</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to cancel the order?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeCancelDialog}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Keep Editing
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Yes, Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBill;
