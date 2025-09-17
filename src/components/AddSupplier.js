import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function AddSupplier() {
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newSupplier, setNewSupplier] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [supplierMsg, setSupplierMsg] = useState('');
  const [brandMsg, setBrandMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [brandsData, suppliersData] = await Promise.all([
      supabase.from('brands').select('*'),
      supabase.from('suppliers').select('*')
    ]);

    if (brandsData.data) setBrands(brandsData.data);
    if (suppliersData.data) setSuppliers(suppliersData.data);
  };

  const handleAddSupplier = async () => {
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
  };

  const handleAddBrand = async () => {
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
  };

  return (
    <div className="p-6 pl-3 md:pl-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Add Supplier (Left) */}
        <div className="bg-white rounded-lg shadow-md shadow-gray-300 p-4 md:p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Add Supplier</h2>
          <input
            type="text"
            className="border px-2 py-1 w-full mb-2 rounded"
            placeholder="Add new supplier"
            value={newSupplier}
            onChange={e => setNewSupplier(e.target.value)}
          />
          <button
            onClick={handleAddSupplier}
            className="px-4 py-2 text-white rounded w-full md:w-auto"
            style={{ backgroundColor: 'rgb(22, 30, 45)' }}
          >
            Add Supplier
          </button>
          {supplierMsg && <div className="mt-2 text-sm text-black">{supplierMsg}</div>}
          
          <h3 className="text-lg font-semibold mb-2 text-black mt-6">Supplier List</h3>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full border text-black mb-6 border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left font-medium text-sm text-gray-700 w-[65%]">Supplier</th>
                  <th className="border p-2 text-left font-medium text-sm text-gray-700 w-[35%]">Date First Added</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-3 py-2 text-gray-800">{s.name}</td>
                    <td className="border px-3 py-2 text-gray-800">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Brand (Right) */}
        <div className="bg-white rounded-lg shadow-md shadow-gray-300 p-6">
          <h2 className="text-xl font-bold mb-4 text-black">Add Brand</h2>
          <input
            type="text"
            className="border px-2 py-1 w-full mb-2 rounded"
            placeholder="Add new brand"
            value={newBrand}
            onChange={e => setNewBrand(e.target.value)}
          />
          <button
            onClick={handleAddBrand}
            className="px-4 py-2 text-white rounded w-full md:w-auto"
            style={{ backgroundColor: 'rgb(22, 30, 45)' }}
          >
            Add Brand
          </button>
          {brandMsg && <div className="mt-2 text-sm text-black">{brandMsg}</div>}
          
          <h3 className="text-lg font-semibold mb-2 text-black mt-6">Brand List</h3>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full border text-black border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left font-medium text-sm text-gray-700 w-[65%]">Brand</th>
                  <th className="border p-2 text-left font-medium text-sm text-gray-700 w-[35%]">Date First Added</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-3 py-2 text-gray-800">{b.name}</td>
                    <td className="border px-3 py-2 text-gray-800">{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
