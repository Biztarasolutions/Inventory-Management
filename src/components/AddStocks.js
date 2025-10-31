import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { SIZES, fileToBase64, formatDateTime, formatIndianNumber } from '../App';
import SearchableDropdown from './SearchableDropdown';
import FilterDropdown from './FilterDropdown';
import DateRangeFilter from './DateRangeFilter';

export function AddStocks() {
  // Product Info state
  const [style, setStyle] = useState('');
  const [code, setCode] = useState('');
  const [mrp, setMrp] = useState('');
  const [image, setImage] = useState(null);
  
  // Feedback states
  const [productMsg, setProductMsg] = useState('');
  const [inventoryMsg, setInventoryMsg] = useState('');
  
  // Data states
  const [selectedProductName, setSelectedProductName] = useState('');
  const [products, setProducts] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [enrichedInventoryHistory, setEnrichedInventoryHistory] = useState([]);
  const [filteredInventoryHistory, setFilteredInventoryHistory] = useState([]);
  
  // Filter states
  const [historyFilters, setHistoryFilters] = useState({
    datetime: [],
    action: [],
    product_name: [],
    mrp: [],
    size: [],
    quantity: [],
    note: [],
    image: []
  });
  
  // Sort state
  const [historySortConfig, setHistorySortConfig] = useState({ key: null, direction: 'asc' });
  
  // Size states
  const [sizes, setSizes] = useState([
    { size: '', quantity: '', note: '' }
  ]);

  // Function to get dynamic filter options based on current filtered data
  const getDynamicFilterOptions = (filterKey) => {
    // Create a temporarily filtered dataset excluding the current filter to avoid empty options
    const tempFilters = { ...historyFilters };
    tempFilters[filterKey] = []; // Remove current filter to get all available options
    
    const tempFilteredData = enrichedInventoryHistory.filter(item => {
      // Action filter logic - match display logic
      const displayedAction = item.action || (item.quantity > 0 ? 'Added' : 'Removed');
      const actionMatch = tempFilters.action.length === 0 || tempFilters.action.includes(displayedAction);
      
      // Image filter logic
      const imageMatch = tempFilters.image.length === 0 || (
        tempFilters.image.includes('Has Image') ? !!item.image :
        tempFilters.image.includes('No Image') ? !item.image :
        true
      );
      
      // Date range filter logic
      let dateMatch = true;
      if (tempFilters.datetime && tempFilters.datetime.start && tempFilters.datetime.end) {
        const itemDate = new Date(item.date);
        const start = new Date(tempFilters.datetime.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(tempFilters.datetime.end);
        end.setHours(23, 59, 59, 999);
        dateMatch = itemDate >= start && itemDate <= end;
      } else if (Array.isArray(tempFilters.datetime) && tempFilters.datetime.length > 0) {
        // Fallback for old array-based filtering
        dateMatch = tempFilters.datetime.includes(item.formatted_date);
      }
      
      return (
        dateMatch &&
        actionMatch &&
        (tempFilters.product_name.length === 0 || tempFilters.product_name.includes(item.product_name)) &&
        (tempFilters.mrp.length === 0 || tempFilters.mrp.includes(item.mrp_value.toString())) &&
        (tempFilters.size.length === 0 || tempFilters.size.includes(item.size)) &&
        (tempFilters.quantity.length === 0 || tempFilters.quantity.includes(item.quantity.toString())) &&
        (tempFilters.note.length === 0 || tempFilters.note.includes(item.note || '')) &&
        imageMatch
      );
    });

    // Return unique values for the specified filter key
    switch (filterKey) {
      case 'action':
        return [...new Set(tempFilteredData.map(item => 
          item.action || (item.quantity > 0 ? 'Added' : 'Removed')
        ))].sort();
      case 'product_name':
        return [...new Set(tempFilteredData.map(item => item.product_name).filter(Boolean))].sort();
      case 'mrp':
        return [...new Set(tempFilteredData.map(item => item.mrp_value.toString()))].sort((a, b) => Number(a) - Number(b));
      case 'size':
        return [...new Set(tempFilteredData.map(item => item.size).filter(Boolean))].sort((a, b) => {
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const aIndex = sizeOrder.indexOf(a);
          const bIndex = sizeOrder.indexOf(b);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.localeCompare(b);
        });
      case 'quantity':
        return [...new Set(tempFilteredData.map(item => item.quantity.toString()))].sort((a, b) => Number(a) - Number(b));
      case 'note':
        return [...new Set(tempFilteredData.map(item => item.note || '').filter(note => note !== ''))].sort();
      case 'image':
        return ['Has Image', 'No Image'];
      default:
        return [];
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [inventoryData, productsData] = await Promise.all([
      supabase.from('inventory').select('*').order('date', { ascending: false }),
      supabase.from('products').select('*')
    ]);

    if (inventoryData.data) setInventoryHistory(inventoryData.data);
    if (productsData.data) setProducts(productsData.data);
  };

  // Enrich and filter inventory history
  useEffect(() => {
    // Filter for today's entries
    const todayFiltered = inventoryHistory.filter(entry => {
      try {
        const entryDate = new Date(entry.date);
        const today = new Date();
        const entryIST = entryDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        const todayIST = today.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        return entryIST === todayIST;
      } catch (error) {
        return false;
      }
    });

    // Enrich the data with product details
    const enrichedData = todayFiltered.map(entry => {
      return {
        ...entry,
        formatted_date: formatDateTime(entry.date),
        product_name: entry.product || '',
        mrp_value: entry.mrp || 0
      };
    });
    
    // Debug: Log sample data to see actual values
    if (enrichedData.length > 0) {
      console.log('Sample enriched data:', enrichedData.slice(0, 3).map(item => ({
        action: item.action,
        quantity: item.quantity,
        displayAction: item.action || (item.quantity > 0 ? 'Added' : 'Removed')
      })));
    }
    
    setEnrichedInventoryHistory(enrichedData);
    
    // Debug: Log current filter state
    if (historyFilters.action.length > 0) {
      console.log('Action filter selected:', historyFilters.action);
    }
    
    // Apply filters
    const filtered = enrichedData.filter(item => {
      // Image filter logic
      let imageMatch = true;
      if (historyFilters.image.length > 0) {
        const hasImage = item.image ? 'Has Image' : 'No Image';
        imageMatch = historyFilters.image.includes(hasImage);
      }
      
      // Action filter logic - match the display logic
      let actionMatch = true;
      if (historyFilters.action.length > 0) {
        const displayedAction = item.action || (item.quantity > 0 ? 'Added' : 'Removed');
        actionMatch = historyFilters.action.includes(displayedAction);
        
        // Debug logging
        if (historyFilters.action.includes('Added')) {
          console.log('Checking item for Added filter:', {
            rawAction: item.action,
            quantity: item.quantity,
            displayedAction,
            matches: actionMatch,
            filterValues: historyFilters.action
          });
        }
      }
      
      // Date range filter logic
      let dateMatch = true;
      if (historyFilters.datetime && historyFilters.datetime.start && historyFilters.datetime.end) {
        const itemDate = new Date(item.date);
        const start = new Date(historyFilters.datetime.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(historyFilters.datetime.end);
        end.setHours(23, 59, 59, 999);
        dateMatch = itemDate >= start && itemDate <= end;
      } else if (Array.isArray(historyFilters.datetime) && historyFilters.datetime.length > 0) {
        // Fallback for old array-based filtering
        dateMatch = historyFilters.datetime.includes(item.formatted_date);
      }
      
      return (
        dateMatch &&
        actionMatch &&
        (historyFilters.product_name.length === 0 || historyFilters.product_name.includes(item.product_name)) &&
        (historyFilters.mrp.length === 0 || historyFilters.mrp.includes(item.mrp_value.toString())) &&
        (historyFilters.size.length === 0 || historyFilters.size.includes(item.size)) &&
        (historyFilters.quantity.length === 0 || historyFilters.quantity.includes(item.quantity.toString())) &&
        (historyFilters.note.length === 0 || historyFilters.note.includes(item.note || '')) &&
        imageMatch
      );
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (!historySortConfig.key) return 0;
      
      let aVal = a[historySortConfig.key];
      let bVal = b[historySortConfig.key];
      
      if (historySortConfig.key === 'date') {
        aVal = new Date(a.date);
        bVal = new Date(b.date);
      } else if (historySortConfig.key === 'quantity' || historySortConfig.key === 'mrp_value') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      
      if (historySortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Hide 'sold' items from the inventory history
  const notSold = sorted.filter(item => item.action !== 'sold');
  setFilteredInventoryHistory(notSold);
  }, [inventoryHistory, products, historyFilters, historySortConfig]);

  // Reset history filters
  const resetHistoryFilters = () => {
    setHistoryFilters({
      datetime: [],
      action: [],
      product_name: [],
      mrp: [],
      size: [],
      quantity: [],
      note: [],
      image: []
    });
    setHistorySortConfig({ key: null, direction: 'asc' });
  };

  // Selected product information
  const selectedProduct = products.find(p => p.product === selectedProductName);

  // Add new product
  const handleAddProduct = async () => {
    setProductMsg('');
    
    if (!style || !code || !mrp) {
      setProductMsg('Please fill all required fields (Style, Code, MRP).');
      return;
    }
    
    const productValue = `${style}-${code}`;
    
    // Check if product already exists
    const existingProduct = products.find(p => p.product === productValue);
    if (existingProduct) {
      setProductMsg('Product already exists!');
      return;
    }
    
    const newProduct = {
      product: productValue,
      mrp: Number(mrp),
      image_url: image ? await fileToBase64(image) : null
    };
    
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    
    if (error) {
      setProductMsg('Error adding product: ' + (error.message || JSON.stringify(error)));
      return;
    }
    
    if (data && data.length > 0) {
      setProducts(prev => [...prev, ...data]);
      setStyle('');
      setCode('');
      setMrp('');
      setImage(null);
      setProductMsg('Product added successfully!');
    } else {
      setProductMsg('Product not added.');
    }
  };

  // Size management
  const handleAddSizeRow = () => {
    setSizes([...sizes, { size: '', quantity: '', note: '' }]);
  };

  const handleSizeChange = (idx, field, value) => {
    setSizes(sizes => sizes.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  // Add inventory
  const handleAddAllToInventory = async () => {
    setInventoryMsg('');
    
    if (!selectedProductName) {
      setInventoryMsg('Please select a product first.');
      return;
    }
    
    const validEntries = sizes.filter(row => row.size && row.quantity && !isNaN(Number(row.quantity)));
    
    if (validEntries.length === 0) {
      setInventoryMsg('Please add at least one valid size with quantity.');
      return;
    }
    
    const now = new Date();
    const formattedDate = now.toISOString();
    
    const newEntries = validEntries.map(row => {
      const quantity = Number(row.quantity);
      const action = quantity < 0 ? 'deleted' : 'added';
      return {
        date: formattedDate,
        action: action,
        product: selectedProduct.product,
        mrp: selectedProduct.mrp,
        image: selectedProduct.image_url,
        size: row.size,
        quantity: quantity,
        note: row.note || ''
      };
    });
    
    try {
      const { data, error } = await supabase.from('inventory').insert(newEntries).select();
      
      if (error) {
        setInventoryMsg('Error adding inventory: ' + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (data && data.length > 0) {
        setInventoryHistory(prev => [...data, ...prev]);
        setInventoryMsg(`Successfully added ${data.length} inventory entries!`);
        setSizes([{ size: '', quantity: '', note: '' }]);
        setSelectedProductName('');
      } else {
        setInventoryMsg('Inventory not added.');
      }
    } catch (err) {
      setInventoryMsg('Error: ' + err.message);
    }
  };

  return (
    <div className="p-6 pl-2 transition-all duration-300" style={{ backgroundColor: '#f7f8fa' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Information Section */}
        <div className="border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 mb-6 md:mb-0 bg-white rounded-lg shadow-md shadow-gray-300 md:ml-0 pl-6 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-black">Product Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-black mb-1">Style</label>
              <input
                type="text"
                value={style}
                onChange={e => setStyle(e.target.value)}
                placeholder="e.g., FS"
                className="border px-2 py-1 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-black mb-1">Code (5 digits)</label>
              <input
                type="text"
                pattern="^[1-9][0-9]{4}$"
                maxLength={5}
                value={code}
                onChange={e => {
                  const val = e.target.value;
                  if (/^[1-9][0-9]{0,4}$/.test(val) || val === "") {
                    setCode(val);
                  }
                }}
                className="border px-2 py-1 w-full"
                required
                inputMode="numeric"
                title="Enter a 5-digit positive integer"
              />
            </div>
            <div>
              <label className="block text-black mb-1">Product (Style-Code)</label>
              <input
                type="text"
                value={style && code ? `${style}-${code}` : ''}
                readOnly
                placeholder="Enter style and code first"
                className="border px-2 py-1 w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-black mb-1">MRP (INR)</label>
              <input
                type="number"
                min="1"
                value={mrp}
                onChange={e => setMrp(e.target.value)}
                className="border px-2 py-1 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-black mb-1">Image file (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImage(e.target.files[0])}
                className="border px-2 py-1 w-full"
              />
            </div>
          </div>
          <button
            onClick={handleAddProduct}
            className="mt-4 px-4 py-2 text-white rounded"
            style={{ backgroundColor: 'rgb(22, 30, 45)' }}
          >
            Add to Product
          </button>
          <div className="mt-2 h-6 transition-all duration-300">
            {productMsg && <div className="text-sm text-black">{productMsg}</div>}
          </div>
        </div>

        {/* Add Inventory & Sizes Section */}
        <div className="space-y-8 bg-white rounded-lg shadow-md shadow-gray-300 p-6">
          {/* Add Inventory Section */}
          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-black">Add Inventory</h2>
            <div className="mb-4">
              <label className="block text-black mb-1">Select Existing Product</label>
              <SearchableDropdown
                value={selectedProductName}
                onChange={(value) => {
                  setSelectedProductName(value || '');
                }}
                options={products.map(p => p.product).filter(Boolean)}
                placeholder="Select Product"
              />
            </div>
            {selectedProduct && (
              <div className="mb-4 p-4 bg-gray-100 border rounded">
                <div className="font-semibold text-black">Selected Product:</div>
                <div>{selectedProduct.product}</div>
              </div>
            )}
          </div>

          {/* Add Sizes & Inventory Section */}
          <div className="mb-6">
            <div className="mb-4 font-bold text-black">Add Sizes & Inventory</div>
            <div className="space-y-2">
              {sizes.map((row, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <SearchableDropdown
                    value={row.size}
                    onChange={(value) => handleSizeChange(idx, 'size', value)}
                    options={SIZES}
                    placeholder="Size"
                    className="w-20"
                  />
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={e => handleSizeChange(idx, 'quantity', e.target.value)}
                    className="border px-2 py-1 w-24"
                    placeholder="Qty"
                    title="Use negative numbers to remove/delete inventory"
                  />
                  <textarea
                    value={row.note}
                    onChange={e => handleSizeChange(idx, 'note', e.target.value)}
                    className="border px-2 py-1 w-40"
                    placeholder="Note (optional)"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col md:flex-row md:space-x-2">
              <button
                onClick={handleAddSizeRow}
                className="px-3 py-1 bg-gray-200 text-black rounded border-none shadow-none mb-2 md:mb-0"
              >
                Add Another Size
              </button>
              <button
                onClick={handleAddAllToInventory}
                className="px-3 py-1 text-white rounded mt-2 md:mt-0"
                style={{ backgroundColor: 'rgb(22, 30, 45)' }}
              >
                Add All to Inventory
              </button>
            </div>
            <div className="mt-2 h-6 transition-all duration-300">
              {inventoryMsg && <div className="text-sm text-black">{inventoryMsg}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Inventory History */}
      <div className="mt-16">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className="text-2xl font-bold text-gray-800">Today's Inventory History</h2>
          <button
            onClick={resetHistoryFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 w-full md:w-auto"
          >
            Clear All Filters
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md my-3" style={{ position: 'relative' }}>
          <div className="overflow-x-auto max-w-full" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="w-full table-fixed min-w-[800px] border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-30">
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <DateRangeFilter
                      label="Date"
                      allDates={[...new Set(enrichedInventoryHistory.map(item => item.formatted_date))]}
                      selectedRange={historyFilters.datetime}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, datetime: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Action"
                      options={getDynamicFilterOptions('action')}
                      selectedValues={historyFilters.action}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, action: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Product"
                      options={getDynamicFilterOptions('product_name')}
                      selectedValues={historyFilters.product_name}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, product_name: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Image"
                      options={getDynamicFilterOptions('image')}
                      selectedValues={historyFilters.image || []}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, image: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="MRP"
                      options={getDynamicFilterOptions('mrp')}
                      selectedValues={historyFilters.mrp}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, mrp: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Size"
                      options={getDynamicFilterOptions('size')}
                      selectedValues={historyFilters.size}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, size: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Quantity"
                      options={getDynamicFilterOptions('quantity')}
                      selectedValues={historyFilters.quantity}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, quantity: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Note"
                      options={getDynamicFilterOptions('note')}
                      selectedValues={historyFilters.note}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, note: values }))}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventoryHistory.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.formatted_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        entry.action === 'sold'
                          ? 'bg-blue-100 text-blue-800'
                          : entry.action === 'added' || entry.quantity > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.action || (entry.quantity > 0 ? 'Added' : 'Removed')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.image ? (
                        <img 
                          src={entry.image} 
                          alt="Product" 
                          className="h-8 w-8 object-cover rounded border"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <span 
                        className="text-gray-400 text-xs" 
                        style={{ display: entry.image ? 'none' : 'block' }}
                      >
                        No image
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">₹{formatIndianNumber(entry.mrp_value)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.size}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatIndianNumber(entry.quantity)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.note}</td>
                  </tr>
                ))}
                {filteredInventoryHistory.length === 0 && (
                  <tr><td colSpan="8" className="text-center py-4 text-gray-500">No inventory history found for today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
