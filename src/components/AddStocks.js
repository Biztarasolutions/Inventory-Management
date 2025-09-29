import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { SIZES, fileToBase64, formatDateTime } from '../App';
import SearchableDropdown from './SearchableDropdown';
import FilterDropdown from './FilterDropdown';

export function AddStocks() {
  // Product Info state
  const [code, setCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [brand, setBrand] = useState('');
  const [mrp, setMrp] = useState('');
  const [image, setImage] = useState(null);
  
  // Feedback states
  const [productMsg, setProductMsg] = useState('');
  const [inventoryMsg, setInventoryMsg] = useState('');
  
  // Data states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [enrichedInventoryHistory, setEnrichedInventoryHistory] = useState([]);
  const [filteredInventoryHistory, setFilteredInventoryHistory] = useState([]);
  
  // Filter states
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
  
  // Sort state
  const [historySortConfig, setHistorySortConfig] = useState({ key: null, direction: 'asc' });
  
  // Size states
  const [sizes, setSizes] = useState([
    { size: '', quantity: '', note: '' }
  ]);

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [inventoryData, productsData, suppliersData, brandsData] = await Promise.all([
      supabase.from('inventory').select('*').order('date', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('brands').select('*')
    ]);

    if (inventoryData.data) setInventoryHistory(inventoryData.data);
    if (productsData.data) setProducts(productsData.data);
    if (suppliersData.data) setSuppliers(suppliersData.data);
    if (brandsData.data) setBrands(brandsData.data);
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
  }, [inventoryHistory, products, suppliers, brands, historyFilters, historySortConfig]);

  // Reset history filters
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

  // Selected product information
  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  const selectedSupplier = selectedProduct ? suppliers.find(s => s.id === selectedProduct.supplier_id) : null;
  const selectedBrand = selectedProduct ? brands.find(b => b.id === selectedProduct.brand_id) : null;

  // Add new product
  const handleAddProduct = async () => {
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
      image_url: image ? await fileToBase64(image) : null
    };
    
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    
    if (error) {
      setProductMsg('Error adding product: ' + (error.message || JSON.stringify(error)));
      return;
    }
    
    if (data && data.length > 0) {
      setProducts(prev => [...prev, ...data]);
      setCode('');
      setSupplier('');
      setBrand('');
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
    
    if (!selectedProductId) {
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
        product_id: selectedProduct.id,
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
        setSelectedProductId('');
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
              <label className="block text-black mb-1">Style</label>
              <input
                type="text"
                value={`FS-${code}`}
                readOnly
                className="border px-2 py-1 w-full bg-gray-100"
              />
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Today's Inventory History</h2>
          <button
            onClick={resetHistoryFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden my-3">
          <div className="overflow-x-auto max-w-full" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <table className="w-full table-fixed md:min-w-[1200px] border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-30">
                <tr>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Date"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.formatted_date))]}
                      selectedValues={historyFilters.datetime}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, datetime: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Action"
                      options={['Added', 'Removed', 'Sold']}
                      selectedValues={historyFilters.action}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, action: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Product"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.product_code).filter(Boolean))]}
                      selectedValues={historyFilters.product_code}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, product_code: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Style"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.style_code).filter(Boolean))]}
                      selectedValues={historyFilters.style_code}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, style_code: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Supplier"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.supplier_name).filter(Boolean))]}
                      selectedValues={historyFilters.supplier}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, supplier: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                    <FilterDropdown
                      label="Brand"
                      options={[...new Set(enrichedInventoryHistory.map(item => item.brand_name).filter(Boolean))]}
                      selectedValues={historyFilters.brand}
                      onChange={(values) => setHistoryFilters(prev => ({ ...prev, brand: values }))}
                    />
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">Image</span>
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">MRP</span>
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
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
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                    <span className="text-gray-700 font-medium">Quantity</span>
                  </th>
                  <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
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
                        entry.action === 'sold'
                          ? 'bg-blue-100 text-blue-800'
                          : entry.action === 'added' || entry.quantity > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.action || (entry.quantity > 0 ? 'Added' : 'Removed')}
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
