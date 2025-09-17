import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import FilterDropdown from './FilterDropdown';

export function StockInventory() {
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

  useEffect(() => {
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

  // Calculate total inventory and inventory by size
  const calculateTotalInventory = () => {
    let total = 0;
    const sizeInventory = {};
    
    filteredData.forEach(item => {
      item.sizes.forEach((quantity, size) => {
        total += quantity;
        sizeInventory[size] = (sizeInventory[size] || 0) + quantity;
      });
    });
    
    return { total, sizeInventory };
  };
  
  const { total, sizeInventory } = calculateTotalInventory();
  
  // Sort sizes for display
  const sortedSizes = Object.keys(sizeInventory).sort((a, b) => {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const aIndex = sizeOrder.indexOf(a);
    const bIndex = sizeOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-6 pl-2">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="bg-white p-3 rounded-lg shadow-sm mb-2 md:mb-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Summary:</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-blue-100 px-3 py-1 rounded-md">
              <span className="font-medium">Total: {total}</span>
            </div>
            {sortedSizes.map(size => (
              <div key={size} className="bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-medium">{size}: {sizeInventory[size]}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={resetAllFilters}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md my-3">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full table-fixed md:min-w-[1200px] border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="grid-cols-auto">
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[110px] w-[10%]">
                  <FilterDropdown
                    label="Product"
                    options={[...new Set(aggregatedData.map(item => item.product_code))]}
                    selectedValues={filters.product_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, product_code: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[110px] w-[10%]">
                  <FilterDropdown
                    label="Style"
                    options={[...new Set(aggregatedData.map(item => item.style_code))]}
                    selectedValues={filters.style_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, style_code: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[110px] w-[12%]">
                  <FilterDropdown
                    label="Supplier"
                    options={[...new Set(aggregatedData.map(item => item.supplier_name))]}
                    selectedValues={filters.supplier_name}
                    onChange={(values) => setFilters(prev => ({ ...prev, supplier_name: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Brand"
                    options={[...new Set(aggregatedData.map(item => item.brand_name))]}
                    selectedValues={filters.brand_name}
                    onChange={(values) => setFilters(prev => ({ ...prev, brand_name: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[80px]">
                  <span className="text-gray-700 font-medium">Image</span>
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[80px]">
                  <span className="text-gray-700 font-medium">MRP</span>
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px] w-[15%]">
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
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b w-[10%] min-w-[120px]">
                  <span className="text-gray-700 font-medium">Total Inventory</span>
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
                    <td className="px-4 py-3 text-sm text-gray-900">{item.mrp}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1.5">
                        {item.available_sizes.map(([size, quantity]) => (
                          quantity > 0 && (
                            <span key={size} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {size}: {quantity}
                            </span>
                          )
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.total_stock}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
