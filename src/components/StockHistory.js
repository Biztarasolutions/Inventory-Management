import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateTime } from '../App';
import FilterDropdown from './FilterDropdown';

export function StockHistory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Filter states
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
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
  };
  
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
      
      <div className="bg-white rounded-lg shadow-md my-3">
        <div className="overflow-x-auto max-w-full" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="min-w-full md:min-w-[1200px] table-auto border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Date"
                    options={[...new Set(enrichedData.map(item => item.formatted_date))]}
                    selectedValues={filters.datetime}
                    onChange={(values) => setFilters(prev => ({ ...prev, datetime: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Product"
                    options={[...new Set(enrichedData.map(item => item.product_code))]}
                    selectedValues={filters.product_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, product_code: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Style"
                    options={[...new Set(enrichedData.map(item => item.style_code))]}
                    selectedValues={filters.style_code}
                    onChange={(values) => setFilters(prev => ({ ...prev, style_code: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Supplier"
                    options={[...new Set(enrichedData.map(item => item.supplier_name))]}
                    selectedValues={filters.supplier}
                    onChange={(values) => setFilters(prev => ({ ...prev, supplier: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Brand"
                    options={[...new Set(enrichedData.map(item => item.brand_name))]}
                    selectedValues={filters.brand}
                    onChange={(values) => setFilters(prev => ({ ...prev, brand: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">MRP</span>
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
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
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                  <span className="text-gray-700 font-medium">Quantity</span>
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
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
