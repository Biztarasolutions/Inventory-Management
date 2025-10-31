import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const FilterDropdown = ({ label, options, selectedValues = [], onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

    // Calculate button position when opening dropdown for both desktop and mobile
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // Approximate height of the dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Position above if not enough space below
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      
      setButtonPosition({
        top: shouldPositionAbove ? rect.top + window.scrollY - dropdownHeight - 5 : rect.bottom + window.scrollY + 2,
        left: isMobile ? Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 296)) : rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen, isMobile, selectedValues.length]);



  // Filter options based on search term (normalize to strings first)
  const lowerTerm = (searchTerm || '').toString().toLowerCase();
  const filteredOptions = options.filter(option =>
    String(option).toLowerCase().includes(lowerTerm)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen) {
        // For both desktop and mobile portal dropdowns, check if click is outside the portal dropdown
        const portalDropdown = document.querySelector('[data-portal-dropdown="true"]');
        if (portalDropdown && !portalDropdown.contains(event.target) && 
            buttonRef.current && !buttonRef.current.contains(event.target)) {
          setTimeout(() => {
            setIsOpen(false);
            setSearchTerm('');
          }, 0);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  const handleOptionChange = (option, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(val => val !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAllClick = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    handleSelectAll();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[80px] px-1 py-1 text-left bg-gray-50 border border-gray-200 rounded-md shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-colors text-sm"
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-800 font-medium text-xs uppercase tracking-wider max-w-[60px] truncate">{label}</span>
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

      {isOpen && !isMobile && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />
          <div 
            className="fixed z-[9999] w-64 bg-white border border-gray-300 rounded-lg shadow-lg"
            data-portal-dropdown="true"
            style={{
              top: `${buttonPosition.top}px`,
              left: `${buttonPosition.left}px`,
              minWidth: `${buttonPosition.width}px`
            }}
          >
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
              onClick={handleSelectAllClick}
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
                onClick={(e) => handleOptionChange(option, e)}
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
        </>,
        document.body
      )}

      {isOpen && isMobile && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />
          <div 
            className="fixed z-[9999] w-72 bg-white border border-gray-300 rounded-lg shadow-lg"
            data-portal-dropdown="true"
            style={{
              top: `${buttonPosition.top}px`,
              left: `${Math.max(8, Math.min(buttonPosition.left, window.innerWidth - 296))}px`
            }}
          >
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
              onClick={handleSelectAllClick}
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
                onClick={(e) => handleOptionChange(option, e)}
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
        </>,
        document.body
      )}
    </div>
  );
};

export default FilterDropdown;
