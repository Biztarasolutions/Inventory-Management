import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DateRangeFilter = ({ label, selectedRange, onChange, allDates = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });


  const [showCalendar, setShowCalendar] = useState(true);
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
      const dropdownHeight = 350; // Approximate height of the dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Position above if not enough space below
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
      
      setButtonPosition({
        top: shouldPositionAbove ? rect.top + window.scrollY - dropdownHeight - 5 : rect.bottom + window.scrollY + 2,
        left: isMobile ? Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 328)) : rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen, isMobile]);



  // Set default dates to today or sync with selectedRange
  useEffect(() => {
    if (selectedRange && selectedRange.startDate && selectedRange.endDate) {
      setStartDate(selectedRange.startDate);
      setEndDate(selectedRange.endDate);
    } else if (!startDate && !endDate) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    }
  }, [selectedRange, startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen) {
        if (isMobile) {
          const portalDropdown = document.querySelector('[data-portal-date-dropdown="true"]');
          if (portalDropdown && !portalDropdown.contains(event.target) && 
              buttonRef.current && !buttonRef.current.contains(event.target)) {
            setTimeout(() => {
              setIsOpen(false);
            }, 0);
          }
        } else {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setTimeout(() => {
              setIsOpen(false);
            }, 0);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  const handleApplyFilter = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (startDate && endDate) {
      // Create date range for filtering
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Since allDates contains formatted date strings, we need to pass the raw date range
      // The parent component will handle the actual filtering
      onChange({ startDate, endDate, start, end });
      setIsOpen(false);
    }
  };

  const handleClearFilter = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    onChange(null);
    setIsOpen(false);
  };

  const getSelectedCount = () => {
    if (selectedRange && selectedRange.startDate && selectedRange.endDate) {
      return 1; // Show 1 to indicate a range is selected
    }
    return 0;
  };



  const renderDatePicker = () => (
    <div className="p-4">
      {/* Date Range Inputs */}
      <div className="space-y-4">
        {showCalendar ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setStartDate(newStartDate);
                  
                  // If end date is not set or is before the new start date, set it to start date
                  if (!endDate || endDate < newStartDate) {
                    setEndDate(newStartDate);
                  }
                  
                  // Close calendar after selecting start date
                  setShowCalendar(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setEndDate(newEndDate);
                  
                  // Close calendar after selecting end date
                  setShowCalendar(false);
                }}
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                readOnly
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeout(() => setShowCalendar(true), 0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-pointer text-sm hover:bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                readOnly
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeout(() => setShowCalendar(true), 0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-pointer text-sm hover:bg-gray-100"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleApplyFilter}
            disabled={!startDate || !endDate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Apply Filter
          </button>
          <button
            onClick={handleClearFilter}
            className="flex-1 px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setShowCalendar(true); // Reset to show calendar when opening
          }
        }}
        className="w-full min-w-[80px] px-1 py-1 text-left bg-gray-50 border border-gray-200 rounded-md shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 focus:outline-none transition-colors text-sm"
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-800 font-medium text-xs uppercase tracking-wider max-w-[60px] truncate">{label}</span>
          <div className="flex items-center ml-1 flex-shrink-0">
            {getSelectedCount() > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-1 py-0 text-[10px] mr-1 font-medium">
                {getSelectedCount()}
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
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed z-[9999] w-80 bg-white border border-gray-300 rounded-lg shadow-lg"
            data-portal-date-dropdown="true"
            style={{
              top: `${buttonPosition.top}px`,
              left: `${buttonPosition.left}px`,
              minWidth: `${buttonPosition.width}px`
            }}
          >
            {renderDatePicker()}
          </div>
        </>,
        document.body
      )}

      {isOpen && isMobile && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed z-[9999] w-80 bg-white border border-gray-300 rounded-lg shadow-lg"
            data-portal-date-dropdown="true"
            style={{
              top: `${buttonPosition.top}px`,
              left: `${Math.max(8, Math.min(buttonPosition.left, window.innerWidth - 328))}px`
            }}
          >
            {renderDatePicker()}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default DateRangeFilter;