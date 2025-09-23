import React, { useState, useRef, useEffect } from 'react';

const FilterDropdown = ({ label, options, selectedValues = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length) {
      // Remove all filtered options from selected values
      const remainingSelected = selectedValues.filter(val => !filteredOptions.includes(val));
      onChange(remainingSelected);
    } else {
      // Add all filtered options to selected values
      const newSelected = [...new Set([...selectedValues, ...filteredOptions])];
      onChange(newSelected);
    }
  };

  const handleOptionChange = (option) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(val => val !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[100px] px-1 py-1 text-left bg-gray-50 border border-gray-200 rounded-md shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-colors text-sm"
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-800 font-medium text-xs uppercase tracking-wider max-w-[80px] truncate">{label}</span>
          <div className="flex items-center ml-1 flex-shrink-0">
            {selectedValues.length > 0 && selectedValues.length < options.length && (
              <span className="bg-blue-500 text-white rounded-full px-1 py-0 text-[10px] mr-1 font-medium">
                {selectedValues.length}
              </span>
            )}
            <svg
              className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg left-0">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-auto">
            {/* Select All Option */}
            <div
              onClick={handleSelectAll}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-200 font-medium text-blue-600"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={filteredOptions.length > 0 && filteredOptions.every(option => selectedValues.includes(option))}
                  onChange={() => {}}
                  className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm">
                  {searchTerm ? `Select All Filtered (${filteredOptions.length})` : 'Select All'}
                </span>
              </div>
            </div>

            {/* Individual Options */}
            {filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => handleOptionChange(option)}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => {}}
                    className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 text-sm truncate">{option}</span>
                </div>
              </div>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                {searchTerm ? 'No matching options found' : 'No options available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
