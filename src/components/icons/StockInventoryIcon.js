import React from 'react';

const StockInventoryIcon = ({ width = 22, height = 22, className = "" }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      style={{ display: 'inline', verticalAlign: 'middle' }}
    >
      {/* Box/Container */}
      <rect 
        x="3" 
        y="5" 
        width="18" 
        height="16" 
        rx="2" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      
      {/* Shelves/Dividers */}
      <line 
        x1="3" 
        y1="9" 
        x2="21" 
        y2="9" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <line 
        x1="3" 
        y1="13" 
        x2="21" 
        y2="13" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <line 
        x1="3" 
        y1="17" 
        x2="21" 
        y2="17" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      
      {/* Vertical dividers */}
      <line 
        x1="9" 
        y1="5" 
        x2="9" 
        y2="21" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <line 
        x1="15" 
        y1="5" 
        x2="15" 
        y2="21" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      
      {/* Items/Boxes in inventory */}
      <rect x="5" y="6.5" width="2" height="1.5" fill="currentColor" opacity="0.7" rx="0.2" />
      <rect x="11" y="6.5" width="2" height="1.5" fill="currentColor" opacity="0.7" rx="0.2" />
      <rect x="17" y="6.5" width="2" height="1.5" fill="currentColor" opacity="0.7" rx="0.2" />
      
      <rect x="5" y="10.5" width="2" height="1.5" fill="currentColor" opacity="0.5" rx="0.2" />
      <rect x="17" y="10.5" width="2" height="1.5" fill="currentColor" opacity="0.5" rx="0.2" />
      
      <rect x="11" y="14.5" width="2" height="1.5" fill="currentColor" opacity="0.6" rx="0.2" />
      <rect x="17" y="14.5" width="2" height="1.5" fill="currentColor" opacity="0.6" rx="0.2" />
      
      <rect x="5" y="18.5" width="2" height="1.5" fill="currentColor" opacity="0.4" rx="0.2" />
      <rect x="11" y="18.5" width="2" height="1.5" fill="currentColor" opacity="0.4" rx="0.2" />
      
      {/* Top handle/lid */}
      <path 
        d="M7 5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default StockInventoryIcon;