import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import { supabase } from './supabaseClient';
import FilterDropdown from './components/FilterDropdown';
import SearchableDropdown from './components/SearchableDropdown';

function StockInventory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // Filter states for each column
  const [filters, setFilters] = useState({
    product_code: [],
    style_code: [],
    supplier_name: [],
    brand_name: [],
    sizes: [],
    total_stock: []
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryData, productsData, suppliersData, brandsData] = await Promise.all([
        supabase.from('inventory').select('*'),
        supabase.from('products').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('brands').select('*')
      ]);

      setInventory(inventoryData.data || []);
      setProducts(productsData.data || []);
      setSuppliers(suppliersData.data || []);
      setBrands(brandsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Get aggregated inventory data
  const getAggregatedInventory = () => {
    const productMap = new Map();
    
    inventory.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const supplier = suppliers.find(s => s.id === product?.supplier_id);
      const brand = brands.find(b => b.id === product?.brand_id);
      
      const key = item.product_id;
      if (!productMap.has(key)) {
        productMap.set(key, {
          product_id: item.product_id,
          product_code: product?.code || 'Unknown',
          style_code: product?.style_code || 'Unknown',
          supplier_name: supplier?.name || 'Unknown',
          brand_name: brand?.name || 'Unknown',
          mrp: product?.mrp || 0,
          image_url: product?.image_url,
          sizes: new Map(),
          total_stock: 0,
          available_sizes: []
        });
      }
      
      const productData = productMap.get(key);
      const qty = Number(item.quantity) || 0;
      
      if (item.action === 'added') {
        productData.sizes.set(item.size, (productData.sizes.get(item.size) || 0) + qty);
        productData.total_stock += Math.max(0, qty); // Only add positive quantities to total
      } else if (item.action === 'deleted') {
        productData.sizes.set(item.size, (productData.sizes.get(item.size) || 0) - qty);
        // Don't subtract from total_stock, we'll recalculate it at the end
      }
    });
    
    // Recalculate total_stock by summing only positive quantities
    productMap.forEach(product => {
      product.total_stock = Array.from(product.sizes.values())
        .filter(quantity => quantity > 0)
        .reduce((sum, quantity) => sum + quantity, 0);
    });
    
    // Add available sizes as a comma-separated string for filtering
    productMap.forEach(product => {
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
      const sortedSizes = Array.from(product.sizes.entries())
        .filter(([size, quantity]) => quantity !== 0)
        .sort((a, b) => {
          const aIndex = sizeOrder.indexOf(a[0]);
          const bIndex = sizeOrder.indexOf(b[0]);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a[0].localeCompare(b[0]);
        });
      product.available_sizes = sortedSizes;
    });
    
    return Array.from(productMap.values()).filter(p => p.sizes.size > 0);
  };

  const aggregatedData = getAggregatedInventory();

  // Apply filters
  const filteredData = aggregatedData.filter(item => {
    return (
      (filters.product_code.length === 0 || filters.product_code.includes(item.product_code)) &&
      (filters.style_code.length === 0 || filters.style_code.includes(item.style_code)) &&
      (filters.supplier_name.length === 0 || filters.supplier_name.includes(item.supplier_name)) &&
      (filters.brand_name.length === 0 || filters.brand_name.includes(item.brand_name)) &&
      (filters.sizes.length === 0 || filters.sizes.some(size => Array.from(item.sizes.keys()).includes(size))) &&
      (filters.total_stock.length === 0 || filters.total_stock.includes(item.total_stock.toString()))
    );
  });

  // Apply sorting
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const resetAllFilters = () => {
    setFilters({
      product_code: [],
      style_code: [],
      supplier_name: [],
      brand_name: [],
      sizes: [],
      total_stock: []
    });
    setSortConfig({ key: null, direction: 'asc' });
  };

  return (
    <div className="p-6 pl-2">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={resetAllFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div>
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[120px] truncate">
                  <FilterDropdown
                    label="Product Code"
                    options={[...new Set(aggregatedData.map(item => item.product_code))]}
                    selectedValues={filters.product_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, product_code: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b min-w-[120px] truncate">
                  <FilterDropdown
                    label="Style Code"
                    options={[...new Set(aggregatedData.map(item => item.style_code))]}
                    selectedValues={filters.style_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, style_code: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Supplier"
                    options={[...new Set(aggregatedData.map(item => item.supplier_name))]}
                    selectedValues={filters.supplier_name}
                    onChange={(values) => setFilters(prev => ({ ...prev, supplier_name: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Brand"
                    options={[...new Set(aggregatedData.map(item => item.brand_name))]}
                    selectedValues={filters.brand_name}
                    onChange={(values) => setFilters(prev => ({ ...prev, brand_name: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">Image</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">MRP</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Sizes"
                    options={[...new Set(aggregatedData.flatMap(item => 
                      Array.from(item.sizes.entries())
                        .filter(([size, quantity]) => quantity > 0)
                        .map(([size]) => size)
                    ))].sort((a, b) => {
                      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                      const aIndex = sizeOrder.indexOf(a);
                      const bIndex = sizeOrder.indexOf(b);
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      return a.localeCompare(b);
                    })}
                    selectedValues={filters.sizes}
                    onChange={(values) => setFilters(prev => ({ ...prev, sizes: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">Total Inventory</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <React.Fragment key={item.product_id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.style_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.supplier_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.brand_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
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
                        style={{ display: item.image_url ? 'none' : 'block' }}
                      >
                        No image
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">₹{item.mrp}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-2">
                        {Array.from(item.sizes.entries())
                          .filter(([size, quantity]) => quantity !== 0)
                          .sort(([a], [b]) => {
                            const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                            const aIndex = sizeOrder.indexOf(a);
                            const bIndex = sizeOrder.indexOf(b);
                            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                            if (aIndex !== -1) return -1;
                            if (bIndex !== -1) return 1;
                            return a.localeCompare(b);
                          })
                          .map(([size, quantity], index) => (
                            <span 
                              key={size}
                              className={`text-xs px-2 py-1 rounded-md border shadow-sm ${
                                quantity < 0 
                                  ? 'bg-red-50 text-red-700 border-red-200 shadow-red-200/50' 
                                  : `bg-blue-50 text-blue-700 border-blue-200 shadow-blue-200/50`
                              }`}
                              style={{
                                boxShadow: quantity < 0 
                                  ? '0 2px 4px rgba(239, 68, 68, 0.1)' 
                                  : `0 2px 4px rgba(59, 130, 246, ${0.1 + (index * 0.05)})`
                              }}
                            >
                              {size}:{quantity}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.total_stock}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setExpandedProduct(expandedProduct === item.product_id ? null : item.product_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {expandedProduct === item.product_id ? 'Hide' : 'View'} Details
                      </button>
                    </td>
                  </tr>
                  {expandedProduct === item.product_id && (
                    <tr>
                      <td colSpan="9" className="px-4 py-4 bg-gray-50">
                        <div className="text-sm">
                          <h4 className="font-semibold mb-3 text-gray-800">Detailed Size Breakdown:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {Array.from(item.sizes.entries())
                              .filter(([size, quantity]) => quantity !== 0)
                              .sort(([a], [b]) => {
                                const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                                const aIndex = sizeOrder.indexOf(a);
                                const bIndex = sizeOrder.indexOf(b);
                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;
                                return a.localeCompare(b);
                              })
                              .map(([size, quantity]) => (
                              <div key={size} className={`bg-white p-4 rounded-lg border shadow-md hover:shadow-lg transition-shadow ${quantity < 0 ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-gray-800 mb-1">{size}</div>
                                  <div className="text-sm text-gray-600 mb-2">Size</div>
                                  <div className={`text-xl font-semibold ${quantity < 0 ? 'text-red-600' : 'text-blue-600'}`}>{quantity}</div>
                                  <div className="text-xs text-gray-500">units</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-blue-800">Total Inventory:</span>
                              <span className="text-xl font-bold text-blue-600">{item.total_stock} units</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {sortedData.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4 text-gray-500">No inventory found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Helper function to format datetime to India time for display
function formatDateTime(dateString) {
  try {
    const date = new Date(dateString);
    // Format to India timezone for display
    const options = {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-IN', options);
  } catch (error) {
    return dateString; // Return original if parsing fails
  }
}

function AddStocks() {
  // Product Info
  const [code, setCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [brand, setBrand] = useState('');
  const [mrp, setMrp] = useState('');
  const [image, setImage] = useState(null);
  // Feedback
  const [productMsg, setProductMsg] = useState('');
  // Inventory
  const [selectedProductId, setSelectedProductId] = useState('');
  // Sizes
  const [sizes, setSizes] = useState([
    { size: '', quantity: '', note: '' }
  ]);
  // History
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [enrichedInventoryHistory, setEnrichedInventoryHistory] = useState([]);
  const [filteredInventoryHistory, setFilteredInventoryHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({
    datetime: [],
    action: [],
    product_code: [],
    style_code: [],
    supplier: [],
    brand: [],
    mrp: [],
    size: [],
    quantity: [],
    note: []
  });
  
  // Sort state for history
  const [historySortConfig, setHistorySortConfig] = useState({ key: null, direction: 'asc' });
  // Supabase integration for products, suppliers, brands, and inventory
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  // Fetch products, suppliers, and brands from Supabase on mount
  React.useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    }
    async function fetchSuppliers() {
      const { data } = await supabase.from('suppliers').select('*');
      if (data) setSuppliers(data);
    }
    async function fetchBrands() {
      const { data } = await supabase.from('brands').select('*');
      if (data) setBrands(data);
    }
    async function fetchInventoryHistory() {
      const { data } = await supabase.from('inventory').select('*').order('date', { ascending: false });
      if (data) setInventoryHistory(data);
    }
    fetchProducts();
    fetchSuppliers();
    fetchBrands();
    fetchInventoryHistory();
  }, []);

  // Filter effect for Today's Inventory History
  React.useEffect(() => {
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

    // Prepare enriched data for filtering
    const enrichedData = todayFiltered.map(entry => {
      const product = products.find(p => p.id === entry.product_id) || {};
      const supplier = suppliers.find(s => s.id === product.supplier_id) || {};
      const brand = brands.find(b => b.id === product.brand_id) || {};
      
      return {
        ...entry,
        product,
        supplier,
        brand,
        formatted_date: formatDateTime(entry.date),
        product_code: product.code || '',
        style_code: product.style_code || '',
        supplier_name: supplier.name || '',
        brand_name: brand.name || '',
        mrp_value: product.mrp || 0
      };
    });
    
    // Store enriched data for filter options
    setEnrichedInventoryHistory(enrichedData);
    
    // Apply filters
    const filtered = enrichedData.filter(item => {
      return (
        (historyFilters.datetime.length === 0 || historyFilters.datetime.includes(item.formatted_date)) &&
        (historyFilters.action.length === 0 || historyFilters.action.includes(item.action)) &&
        (historyFilters.product_code.length === 0 || historyFilters.product_code.includes(item.product_code)) &&
        (historyFilters.style_code.length === 0 || historyFilters.style_code.includes(item.style_code)) &&
        (historyFilters.supplier.length === 0 || historyFilters.supplier.includes(item.supplier_name)) &&
        (historyFilters.brand.length === 0 || historyFilters.brand.includes(item.brand_name)) &&
        (historyFilters.mrp.length === 0 || historyFilters.mrp.includes(item.mrp_value.toString())) &&
        (historyFilters.size.length === 0 || historyFilters.size.includes(item.size)) &&
        (historyFilters.quantity.length === 0 || historyFilters.quantity.includes(item.quantity.toString())) &&
        (historyFilters.note.length === 0 || historyFilters.note.includes(item.note || ''))
      );
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (!historySortConfig.key) return 0;
      
      let aVal = a[historySortConfig.key];
      let bVal = b[historySortConfig.key];
      
      // Handle different data types
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

    setFilteredInventoryHistory(sorted);
  }, [inventoryHistory, products, suppliers, brands, historyFilters, historySortConfig]);

  // Removed unused handleHistoryFilterChange and handleHistorySort

  const resetHistoryFilters = () => {
    setHistoryFilters({
      datetime: [],
      action: [],
      product_code: [],
      style_code: [],
      supplier: [],
      brand: [],
      mrp: [],
      size: [],
      quantity: [],
      note: []
    });
    setHistorySortConfig({ key: null, direction: 'asc' });
  };

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  const selectedSupplier = selectedProduct ? suppliers.find(s => s.id === selectedProduct.supplier_id) : null;
  const selectedBrand = selectedProduct ? brands.find(b => b.id === selectedProduct.brand_id) : null;

  // Handlers
  async function handleAddProduct() {
    setProductMsg('');
    if (!code || !supplier || !brand || !mrp) {
      setProductMsg('Please fill all required fields.');
      return;
    }
    const supplierObj = suppliers.find(s => s.name === supplier);
    const brandObj = brands.find(b => b.name === brand);
    if (!supplierObj || !brandObj) {
      setProductMsg('Selected supplier or brand not found.');
      return;
    }
    const newProduct = {
      code: Number(code),
      style_code: `FS-${code}`,
      supplier_id: supplierObj.id,
      brand_id: brandObj.id,
      mrp: Number(mrp),
      image_url: image ? `data:${image.type};base64,${await fileToBase64(image)}` : null
    };
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    if (error) {
      setProductMsg('Error adding product: ' + (error.message || JSON.stringify(error)));
      return;
    }
    if (data && data.length > 0) {
      setProducts(prev => [...prev, ...data]);
      setCode(''); setSupplier(''); setBrand(''); setMrp(''); setImage(null);
      setProductMsg('Product added successfully!');
    } else {
      setProductMsg('Product not added.');
    }
  }
  function handleAddSizeRow() {
    setSizes([...sizes, { size: '', quantity: '', note: '' }]);
  }
  function handleSizeChange(idx, field, value) {
    setSizes(sizes => sizes.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }
  const [inventoryMsg, setInventoryMsg] = useState('');
  async function handleAddAllToInventory() {
    setInventoryMsg('');
    
    if (!selectedProductId) {
      setInventoryMsg('Please select a product first.');
      return;
    }
    
    // Filter out empty rows and validate data
    const validEntries = sizes.filter(row => row.size && row.quantity && !isNaN(Number(row.quantity)));
    
    if (validEntries.length === 0) {
      setInventoryMsg('Please add at least one valid size with quantity.');
      return;
    }
    
    // Use current time - Supabase will handle timezone automatically
    const now = new Date();
    const formattedDate = now.toISOString();
    
    const newEntries = validEntries.map(row => {
      const quantity = Number(row.quantity);
      const action = quantity < 0 ? 'deleted' : 'added';
      return {
        date: formattedDate,
        action: action,
        product_id: selectedProduct.id,
        size: row.size,
        quantity: quantity, // Keep the original value with sign
        note: row.note || ''
      };
    });
    
    try {
      // Save to Supabase inventory table
      const { data, error } = await supabase.from('inventory').insert(newEntries).select();
      if (error) {
        setInventoryMsg('Error adding inventory: ' + (error.message || JSON.stringify(error)));
        return;
      }
      if (data && data.length > 0) {
        setInventoryHistory(prev => [...data, ...prev]);
        setInventoryMsg(`Successfully added ${data.length} inventory entries!`);
        // Reset the form
        setSizes([{ size: '', quantity: '', note: '' }]);
        setSelectedProductId('');
      } else {
        setInventoryMsg('Inventory not added.');
      }
    } catch (err) {
      setInventoryMsg('Error: ' + err.message);
    }
  }

  return (
    <div className="p-6 pl-2 transition-all duration-300" style={{ backgroundColor: '#f7f8fa' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Information Section (Left) */}
        <div className="border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 mb-6 md:mb-0 bg-white rounded-lg shadow-md shadow-gray-300 md:ml-0 pl-6 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-black">Product Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-black mb-1">Code (5 digits)</label>
              <input type="text" pattern="^[1-9][0-9]{4}$" maxLength={5} value={code} onChange={e => { const val = e.target.value; if (/^[1-9][0-9]{0,4}$/.test(val) || val === "") { setCode(val); } }} className="border px-2 py-1 w-full" required inputMode="numeric" title="Enter a 5-digit positive integer" />
            </div>
            <div>
              <label className="block text-black mb-1">Style Code</label>
              <input type="text" value={`FS-${code}`} readOnly className="border px-2 py-1 w-full bg-gray-100" />
            </div>
            <div>
              <label className="block text-black mb-1">Supplier</label>
              <SearchableDropdown
                value={supplier}
                onChange={setSupplier}
                options={suppliers.map(s => s.name)}
                placeholder="Select Supplier"
              />
            </div>
            <div>
              <label className="block text-black mb-1">Brand</label>
              <SearchableDropdown
                value={brand}
                onChange={setBrand}
                options={brands.map(b => b.name)}
                placeholder="Select Brand"
              />
            </div>
            <div>
              <label className="block text-black mb-1">MRP (INR)</label>
              <input type="number" min="1" value={mrp} onChange={e => setMrp(e.target.value)} className="border px-2 py-1 w-full" required />
            </div>
            <div>
              <label className="block text-black mb-1">Image file (Optional)</label>
              <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} className="border px-2 py-1 w-full" />
            </div>
          </div>
          <button onClick={handleAddProduct} className="mt-4 px-4 py-2 text-white rounded" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>Add to Product</button>
          <div className="mt-2 h-6 transition-all duration-300">
            {productMsg && <div className="text-sm text-black">{productMsg}</div>}
          </div>
        </div>
        {/* Add Inventory & Add Sizes & Inventory (Right) */}
        <div className="space-y-8 bg-white rounded-lg shadow-md shadow-gray-300 p-6">
          {/* Add Inventory Section */}
          <div className="border-b pb-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-black">Add Inventory</h2>
            <div className="mb-4">
              <label className="block text-black mb-1">Select Existing Product</label>
              <SearchableDropdown
                value={selectedProductId ? (() => {
                  const product = products.find(p => p.id.toString() === selectedProductId);
                  if (!product) return '';
                  const supplier = suppliers.find(s => s.id === product.supplier_id);
                  const brand = brands.find(b => b.id === product.brand_id);
                  return `${product.code} - ${supplier?.name || 'Unknown'} - ${brand?.name || 'Unknown'}`;
                })() : ''}
                onChange={(value) => {
                  if (!value) {
                    setSelectedProductId('');
                    return;
                  }
                  const productCode = value.split(' - ')[0];
                  const product = products.find(p => p.code.toString() === productCode);
                  setSelectedProductId(product ? product.id.toString() : '');
                }}
                options={products.map(p => {
                  const supplier = suppliers.find(s => s.id === p.supplier_id);
                  const brand = brands.find(b => b.id === p.brand_id);
                  return `${p.code} - ${supplier?.name || 'Unknown'} - ${brand?.name || 'Unknown'}`;
                })}
                placeholder="Select Product"
              />
            </div>
            {selectedProduct && (
              <div className="mb-4 p-4 bg-gray-100 border rounded">
                <div className="font-semibold text-black">Selected Product:</div>
                <div>{`${selectedProduct.style_code} - ${selectedSupplier ? selectedSupplier.name : 'Unknown'} - ${selectedBrand ? selectedBrand.name : 'Unknown'}`}</div>
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
                  <textarea value={row.note} onChange={e => handleSizeChange(idx, 'note', e.target.value)} className="border px-2 py-1 w-40" placeholder="Note (optional)" />
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-col md:flex-row md:space-x-2">
              <button onClick={handleAddSizeRow} className="px-3 py-1 bg-gray-200 text-black rounded border-none shadow-none mb-2 md:mb-0">Add Another Size</button>
              <button onClick={handleAddAllToInventory} className="px-3 py-1 text-white rounded mt-2 md:mt-0" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>Add All to Inventory</button>
            </div>
            <div className="mt-2 h-6 transition-all duration-300">
              {inventoryMsg && <div className="text-sm text-black">{inventoryMsg}</div>}
            </div>
          </div>
        </div>
      </div>
      {/* Inventory Added/Removed History for Today */}
      <div className="mt-16"> {/* Increased margin to account for fixed page header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Today's Inventory History</h2>
          <button
            onClick={resetHistoryFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Date & Time"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.formatted_date))]}
                      selectedValues={historyFilters.datetime}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, datetime: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Action"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.action))]}
                      selectedValues={historyFilters.action}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, action: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Product Code"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.product_code))]}
                      selectedValues={historyFilters.product_code}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, product_code: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Style Code"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.style_code))]}
                      selectedValues={historyFilters.style_code}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, style_code: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Supplier"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.supplier_name))]}
                      selectedValues={historyFilters.supplier}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, supplier: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Brand"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.brand_name))]}
                      selectedValues={historyFilters.brand}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, brand: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">Image</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">MRP</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Size"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.size))].sort((a, b) => {
                        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                        const aIndex = sizeOrder.indexOf(a);
                        const bIndex = sizeOrder.indexOf(b);
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return a.localeCompare(b);
                      })}
                      selectedValues={historyFilters.size}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, size: values }))}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">Quantity</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <FilterDropdown
                      label="Note"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.note || '').filter(note => note !== ''))]}
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
                        entry.action === 'added' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.product_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.style_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.supplier_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.brand_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.product.image_url ? (
                        <img 
                          src={entry.product.image_url} 
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
                        style={{ display: entry.product.image_url ? 'none' : 'block' }}
                      >
                        No image
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">₹{entry.mrp_value}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.size}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{entry.note}</td>
                  </tr>
                ))}
                {filteredInventoryHistory.length === 0 && (
                  <tr><td colSpan="11" className="text-center py-4 text-gray-500">No inventory history found for today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockHistory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Filter states for each column
  const [filters, setFilters] = useState({
    datetime: [],
    product_code: [],
    style_code: [],
    supplier: [],
    brand: [],
    mrp: [],
    size: [],
    quantity: [],
    note: []
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  React.useEffect(() => {
    async function fetchAll() {
      const [invRes, prodRes, supRes, brandRes] = await Promise.all([
        supabase.from('inventory').select('*').order('date', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('brands').select('*'),
      ]);
      if (invRes.data) setInventory(invRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (supRes.data) setSuppliers(supRes.data);
      if (brandRes.data) setBrands(brandRes.data);
    }
    fetchAll();
  }, []);
  
  // Prepare enriched data
  const enrichedData = inventory.map(row => {
    const product = products.find(p => p.id === row.product_id) || {};
    const supplier = suppliers.find(s => s.id === product.supplier_id) || {};
    const brand = brands.find(b => b.id === product.brand_id) || {};
    
    return {
      ...row,
      product,
      supplier,
      brand,
      formatted_date: formatDateTime(row.date),
      product_code: product.code || '',
      style_code: product.style_code || '',
      supplier_name: supplier.name || '',
      brand_name: brand.name || '',
      mrp_value: product.mrp || 0
    };
  });

  // Apply filters
  const filteredData = enrichedData.filter(item => {
    return (
      (filters.datetime.length === 0 || filters.datetime.includes(item.formatted_date)) &&
      (filters.product_code.length === 0 || filters.product_code.includes(item.product_code)) &&
      (filters.style_code.length === 0 || filters.style_code.includes(item.style_code)) &&
      (filters.supplier.length === 0 || filters.supplier.includes(item.supplier_name)) &&
      (filters.brand.length === 0 || filters.brand.includes(item.brand_name)) &&
      (filters.mrp.length === 0 || filters.mrp.includes(item.mrp_value.toString())) &&
      (filters.size.length === 0 || filters.size.includes(item.size)) &&
      (filters.quantity.length === 0 || filters.quantity.includes(item.quantity.toString())) &&
      (filters.note.length === 0 || filters.note.includes(item.note || ''))
    );
  });

  // Apply sorting
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    // Handle different data types
    if (sortConfig.key === 'date') {
      aVal = new Date(a.date);
      bVal = new Date(b.date);
    } else if (sortConfig.key === 'quantity' || sortConfig.key === 'mrp_value') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }
    
    if (sortConfig.direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const resetAllFilters = () => {
    setFilters({
      datetime: [],
      product_code: [],
      style_code: [],
      supplier: [],
      brand: [],
      mrp: [],
      size: [],
      quantity: [],
      note: []
    });
    setSortConfig({ key: null, direction: 'asc' });
  };
  
  return (
    <div className="p-6 pl-2">
      <div className="flex justify-end items-center mb-6">
        <button
          onClick={resetAllFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto max-h-screen">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Date & Time"
                    options={[...new Set(enrichedData.map(item => item.formatted_date))]}
                    selectedValues={filters.datetime}
                    onChange={(values) => setFilters(prev => ({ ...prev, datetime: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Product Code"
                    options={[...new Set(enrichedData.map(item => item.product_code))]}
                    selectedValues={filters.product_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, product_code: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Style Code"
                    options={[...new Set(enrichedData.map(item => item.style_code))]}
                    selectedValues={filters.style_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, style_code: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Supplier"
                    options={[...new Set(enrichedData.map(item => item.supplier_name))]}
                    selectedValues={filters.supplier}
                    onChange={(values) => setFilters(prev => ({ ...prev, supplier: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Brand"
                    options={[...new Set(enrichedData.map(item => item.brand_name))]}
                    selectedValues={filters.brand}
                    onChange={(values) => setFilters(prev => ({ ...prev, brand: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">MRP</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Size"
                    options={[...new Set(enrichedData.map(item => item.size))].sort((a, b) => {
                      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
                      const aIndex = sizeOrder.indexOf(a);
                      const bIndex = sizeOrder.indexOf(b);
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      return a.localeCompare(b);
                    })}
                    selectedValues={filters.size}
                    onChange={(values) => setFilters(prev => ({ ...prev, size: values }))}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">Quantity</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <FilterDropdown
                    label="Note"
                    options={[...new Set(enrichedData.map(item => item.note || '').filter(note => note !== ''))]}
                    selectedValues={filters.note}
                    onChange={(values) => setFilters(prev => ({ ...prev, note: values }))}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.formatted_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.product_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.style_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.brand_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{item.mrp_value}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.size}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.note}</td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4 text-gray-500">No stock history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddSupplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newSupplier, setNewSupplier] = useState('');
  const [newBrand, setNewBrand] = useState('');

  // Fetch brands and suppliers from Supabase on mount
  React.useEffect(() => {
    async function fetchBrands() {
      const { data } = await supabase.from('brands').select('*');
      if (data) setBrands(data);
    }
    async function fetchSuppliers() {
      const { data } = await supabase.from('suppliers').select('*');
      if (data) setSuppliers(data);
    }
    fetchBrands();
    fetchSuppliers();
  }, []);

  // Add new supplier to Supabase
  const [supplierMsg, setSupplierMsg] = useState('');
  const [brandMsg, setBrandMsg] = useState('');
  async function handleAddSupplier() {
    setSupplierMsg('');
    if (!newSupplier) {
      setSupplierMsg('Supplier name required.');
      return;
    }
    if (suppliers.some(s => s.name.toLowerCase() === newSupplier.toLowerCase())) {
      setSupplierMsg('Supplier already exists.');
      return;
    }
    const { data, error } = await supabase.from('suppliers').insert([{ name: newSupplier }]);
    if (error) {
      setSupplierMsg('Error adding supplier: ' + (error.message || JSON.stringify(error)));
    } else {
      setSupplierMsg('Supplier added!');
      if (data) setSuppliers([...suppliers, ...data]);
      setNewSupplier('');
    }
  }
  async function handleAddBrand() {
    setBrandMsg('');
    if (!newBrand) {
      setBrandMsg('Brand name required.');
      return;
    }
    if (brands.some(b => b.name.toLowerCase() === newBrand.toLowerCase())) {
      setBrandMsg('Brand already exists.');
      return;
    }
    const { data, error } = await supabase.from('brands').insert([{ name: newBrand }]);
    if (error) {
      setBrandMsg('Error adding brand: ' + (error.message || JSON.stringify(error)));
    } else {
      setBrandMsg('Brand added!');
      if (data) setBrands([...brands, ...data]);
      setNewBrand('');
    }
  }

  return (
    <div className="p-6 pl-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add Supplier (Left) */}
  <div className="bg-white rounded-lg shadow-md shadow-gray-300 p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Add Supplier</h2>
          <input type="text" className="border px-2 py-1 w-full mb-2" placeholder="Add new supplier" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} />
          <button onClick={handleAddSupplier} className="px-4 py-2 text-white rounded" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>Add Supplier</button>
          {supplierMsg && <div className="mt-2 text-sm text-black">{supplierMsg}</div>}
          <h3 className="text-lg font-semibold mb-2 text-black mt-6">Supplier List</h3>
          <table className="w-full border text-black mb-6">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">Supplier</th>
                <th className="border px-2 py-1">Date First Added</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{s.name}</td>
                  <td className="border px-2 py-1">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Add Brand (Right) */}
  <div className="bg-white rounded-lg shadow-md shadow-gray-300 p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Add Brand</h2>
          <input type="text" className="border px-2 py-1 w-full mb-2" placeholder="Add new brand" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
          <button onClick={handleAddBrand} className="px-4 py-2 text-white rounded" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>Add Brand</button>
          {brandMsg && <div className="mt-2 text-sm text-black">{brandMsg}</div>}
          <h3 className="text-lg font-semibold mb-2 text-black mt-6">Brand List</h3>
          <table className="w-full border text-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">Brand</th>
                <th className="border px-2 py-1">Date First Added</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{b.name}</td>
                  <td className="border px-2 py-1">{b.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [navOpen, setNavOpen] = useState(true);
  return (
    <Router>
      <AppContent navOpen={navOpen} setNavOpen={setNavOpen} />
    </Router>
  );
}

function AppContent({ navOpen, setNavOpen }) {
  const location = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(200); // Default 200px (smaller than original w-64)
  const [isResizing, setIsResizing] = useState(false);
  
  const pageNames = {
    '/add-stocks': 'Add Stocks',
    '/stock-inventory': 'Stock Inventory',
    '/stock-history': 'Stock History',
    '/add-supplier': 'Add Supplier',
    '/': 'Add Stocks',
  };
  const currentPage = pageNames[location.pathname] || '';
  const navLinks = [
    { to: '/add-stocks', label: 'Add Stocks', icon: '📦' },
    { to: '/stock-inventory', label: 'Stock Inventory', icon: '📋' },
    { to: '/stock-history', label: 'Stock History', icon: '🕑' },
    { to: '/add-supplier', label: 'Add Supplier', icon: '🏷️' },
  ];

  // Handle mouse events for resizing
  // Removed unused handleMouseDown

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= 150 && newWidth <= 300) { // Min 150px, Max 300px
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove]); // Added handleMouseMove to dependency array

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 text-white py-4 px-8 text-2xl font-bold shadow flex items-center justify-between z-50" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>
        <span>Inventory Management</span>
        <span className="ml-4 text-lg font-normal">{currentPage}</span>
      </header>
      <div className="flex pt-16"> {/* Add top padding for fixed header */}
        {/* Left Navigation - Fixed, with partition line */}
        <nav 
          className={`bg-white pl-5 pr-1 pb-6 pt-2 flex flex-col space-y-4 border-r-2 border-gray-400 relative transition-all duration-300 flex-shrink-0 fixed left-0 top-16 bottom-0 z-40`}
          style={{ width: navOpen ? `${sidebarWidth}px` : '64px' }}
        >
          {/* Arrow button at top right of partition line */}
          <button
            className="absolute top-2 right-[-12px] bg-gray-300 text-black rounded-full p-1 shadow border border-gray-400 z-50"
            style={{ width: '24px', height: '24px' }}
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? 'Minimize navigation' : 'Expand navigation'}
          >
            {navOpen ? (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5L7 10L12 15" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5L13 10L8 15" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {/* Navigation menu content here */}
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={
                navOpen
                  ? `text-lg font-semibold mt-2 ${location.pathname === link.to ? 'text-white rounded px-2 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
                  : `text-xs font-semibold text-center mt-2 ${location.pathname === link.to ? 'text-white rounded px-1 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
              }
            >
              {navOpen ? link.label : <span title={link.label}>{link.icon}</span>}
            </Link>
          ))}
        </nav>
        {/* Main Content */}
        <main 
          className="flex-1 min-w-0 transition-all duration-300"
        >
          {/* Content */}
          <div>
            <Routes>
              <Route path="/add-stocks" element={<AddStocks />} />
              <Route path="/stock-inventory" element={<StockInventory />} />
              <Route path="/stock-history" element={<StockHistory />} />
              <Route path="/add-supplier" element={<AddSupplier />} />
              <Route path="/" element={<AddStocks />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
