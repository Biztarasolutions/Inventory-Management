import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateTime, formatIndianNumber } from '../App';
import FilterDropdown from './FilterDropdown';
import DateRangeFilter from './DateRangeFilter';

export function StockHistory() {
  const [inventory, setInventory] = useState([]);
  
  // Filter states with proper initialization
  const [filters, setFilters] = useState({
    datetime: null, // Changed to null for DateRangeFilter
    action: [],
    product_name: [],
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
    const invRes = await supabase.from('inventory').select('*').order('date', { ascending: false });
    
    if (invRes.data) setInventory(invRes.data);
  };
  
  // Prepare enriched data
  const enrichedData = inventory.map(row => {
    return {
      ...row,
      formatted_date: formatDateTime(row.date),
      product_name: row.product || '',
      mrp_value: row.mrp || 0
    };
  });

  // Apply filters
  const filteredData = enrichedData.filter(item => {
    // Action filter logic - match the display logic exactly
    const displayedAction = item.action === 'sold' ? 'Sold' : (item.quantity > 0 ? 'Added' : 'Removed');
    
    // Date range filter logic
    let dateMatch = true;
    if (filters.datetime && filters.datetime.startDate && filters.datetime.endDate) {
      const itemDate = new Date(item.date);
      const start = new Date(filters.datetime.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.datetime.endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch = itemDate >= start && itemDate <= end;
    }
    
    return (
      dateMatch &&
      (filters.action.length === 0 || filters.action.includes(displayedAction)) &&
      (filters.product_name.length === 0 || filters.product_name.includes(item.product_name)) &&
      (filters.mrp.length === 0 || filters.mrp.includes(item.mrp_value.toString())) &&
      (filters.size.length === 0 || filters.size.includes(item.size)) &&
      (filters.quantity.length === 0 || filters.quantity.includes(item.quantity.toString())) &&
      (filters.note.length === 0 || filters.note.includes(item.note || ''))
    );
  });

  // Function to get dynamic filter options based on current filtered data
  const getDynamicFilterOptions = (filterKey) => {
    // Create a temporarily filtered dataset excluding the current filter to avoid empty options
    const tempFilters = { ...filters };
    tempFilters[filterKey] = []; // Remove current filter to get all available options
    
    const tempFilteredData = enrichedData.filter(item => {
      // Action filter logic - match the display logic exactly
      const displayedAction = item.action === 'sold' ? 'Sold' : (item.quantity > 0 ? 'Added' : 'Removed');
      
      // Date range filter logic
      let dateMatch = true;
      if (tempFilters.datetime && tempFilters.datetime.startDate && tempFilters.datetime.endDate) {
        const itemDate = new Date(item.date);
        const start = new Date(tempFilters.datetime.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(tempFilters.datetime.endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch = itemDate >= start && itemDate <= end;
      }
      
      return (
        dateMatch &&
        (tempFilters.action.length === 0 || tempFilters.action.includes(displayedAction)) &&
        (tempFilters.product_name.length === 0 || tempFilters.product_name.includes(item.product_name)) &&
        (tempFilters.mrp.length === 0 || tempFilters.mrp.includes(item.mrp_value.toString())) &&
        (tempFilters.size.length === 0 || tempFilters.size.includes(item.size)) &&
        (tempFilters.quantity.length === 0 || tempFilters.quantity.includes(item.quantity.toString())) &&
        (tempFilters.note.length === 0 || tempFilters.note.includes(item.note || ''))
      );
    });

    // Return unique values for the specified filter key
    switch (filterKey) {
      case 'action':
        return [...new Set(tempFilteredData.map(item => 
          item.action === 'sold' ? 'Sold' : (item.quantity > 0 ? 'Added' : 'Removed')
        ))].sort();
      case 'product_name':
        return [...new Set(tempFilteredData.map(item => item.product_name))].sort();
      case 'mrp':
        return [...new Set(tempFilteredData.map(item => item.mrp_value.toString()))].sort((a, b) => Number(a) - Number(b));
      case 'size':
        return [...new Set(tempFilteredData.map(item => item.size))].sort((a, b) => {
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
      default:
        return [];
    }
  };

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
      datetime: null, // Changed to null for DateRangeFilter
      action: [],
      product_name: [],
      mrp: [],
      size: [],
      quantity: [],
      note: []
    });
    setSortConfig({ key: null, direction: 'asc' });
  };
  
  // Calculate inventory summary from filtered data
  const calculateInventorySummary = () => {
    let totalEntries = filteredData.length;
    let totalQuantity = 0;
    let addedQuantity = 0;
    let removedQuantity = 0;
    let soldQuantity = 0;
    const sizeInventory = {};
    
    filteredData.forEach(item => {
      const quantity = Math.abs(item.quantity || 0);
      const displayedAction = item.action === 'sold' ? 'Sold' : (item.quantity > 0 ? 'Added' : 'Removed');
      
      totalQuantity += quantity;
      
      if (displayedAction === 'Added') {
        addedQuantity += quantity;
      } else if (displayedAction === 'Removed') {
        removedQuantity += quantity;
      } else if (displayedAction === 'Sold') {
        soldQuantity += quantity;
      }
      
      // Size breakdown
      const size = item.size;
      if (size) {
        sizeInventory[size] = (sizeInventory[size] || 0) + quantity;
      }
    });
    
    return { totalEntries, totalQuantity, addedQuantity, removedQuantity, soldQuantity, sizeInventory };
  };

  const { totalEntries, totalQuantity, addedQuantity, removedQuantity, soldQuantity, sizeInventory } = calculateInventorySummary();
  
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
      <h1 className="text-2xl font-bold mb-4">Stock History</h1>
      
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="bg-white p-3 rounded-lg shadow-sm mb-2 md:mb-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Inventory Summary:</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-blue-100 px-3 py-1 rounded-md">
              <span className="font-medium">Entries: {formatIndianNumber(totalEntries)}</span>
            </div>
            <div className="bg-green-100 px-3 py-1 rounded-md">
              <span className="font-medium">Added: {formatIndianNumber(addedQuantity)}</span>
            </div>
            <div className="bg-red-100 px-3 py-1 rounded-md">
              <span className="font-medium">Removed: {formatIndianNumber(removedQuantity)}</span>
            </div>
            <div className="bg-yellow-100 px-3 py-1 rounded-md">
              <span className="font-medium">Sold: {formatIndianNumber(soldQuantity)}</span>
            </div>
            <div className="bg-purple-100 px-3 py-1 rounded-md">
              <span className="font-medium">Total Qty: {formatIndianNumber(totalQuantity)}</span>
            </div>
            {sortedSizes.map(size => (
              <div key={size} className="bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-medium">{size}: {formatIndianNumber(sizeInventory[size])}</span>
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
        <div className="overflow-x-auto max-w-full" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="min-w-full md:min-w-[1200px] table-auto border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <DateRangeFilter
                    label="Date"
                    allDates={[...new Set(enrichedData.map(item => item.formatted_date))]}
                    selectedRange={filters.datetime}
                    onChange={(values) => setFilters(prev => ({ ...prev, datetime: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Action"
                    options={getDynamicFilterOptions('action')}
                    selectedValues={filters.action}
                    onChange={(values) => setFilters(prev => ({ ...prev, action: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Product"
                    options={getDynamicFilterOptions('product_name')}
                    selectedValues={filters.product_name}
                    onChange={(values) => setFilters(prev => ({ ...prev, product_name: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="MRP"
                    options={getDynamicFilterOptions('mrp')}
                    selectedValues={filters.mrp}
                    onChange={(values) => setFilters(prev => ({ ...prev, mrp: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Size"
                    options={getDynamicFilterOptions('size')}
                    selectedValues={filters.size}
                    onChange={(values) => setFilters(prev => ({ ...prev, size: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Quantity"
                    options={getDynamicFilterOptions('quantity')}
                    selectedValues={filters.quantity}
                    onChange={(values) => setFilters(prev => ({ ...prev, quantity: values }))}
                  />
                </th>
                <th className="p-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b min-w-[120px]">
                  <FilterDropdown
                    label="Note"
                    options={getDynamicFilterOptions('note')}
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
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.action === 'sold'
                        ? 'bg-blue-100 text-blue-800'
                        : item.quantity > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {item.action === 'sold' ? 'Sold' : (item.quantity > 0 ? 'Added' : 'Removed')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{formatIndianNumber(item.mrp_value)}</td>
                  <td className="px-4 py-3 text-small text-gray-900">{item.size}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatIndianNumber(item.quantity)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.note}</td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr><td colSpan="7" className="text-center py-4 text-gray-500">No stock history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
