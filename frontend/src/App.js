import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

// Create contexts for window management and data
const WindowManagerContext = createContext();
const DataContext = createContext();

// Custom hook for window management
function useWindowManager() {
  return useContext(WindowManagerContext);
}

// Custom hook for data access
function useData() {
  return useContext(DataContext);
}

// Backend API URL from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Window component with enhanced features
function Window({ 
  id, 
  title, 
  children, 
  initialPosition, 
  initialSize, 
  module, 
  onClose,
  onMinimize,
  onMaximize,
  isMaximized,
  isMinimized,
  bringToFront 
}) {
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [size, setSize] = useState(initialSize || { width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(true);
  const [snapZone, setSnapZone] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [resizeStartPos, setResizeStartPos] = useState(null);
  const [resizeStartSize, setResizeStartSize] = useState(null);
  
  // Refs for DOM elements
  const windowRef = useRef(null);
  const headerRef = useRef(null);
  
  // Window state classes
  const windowClasses = [
    'optra-window',
    isActive ? 'active' : '',
    isMinimized ? 'minimized' : '',
    isMaximized ? 'maximized' : '',
    snapZone ? `snapped-${snapZone}` : ''
  ].filter(Boolean).join(' ');
  
  // Handle window dragging
  const handleMouseDown = (e) => {
    if (headerRef.current && headerRef.current.contains(e.target)) {
      if (e.target.closest('.optra-window-control')) {
        // Don't start dragging if clicking on window controls
        return;
      }
      
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      bringToFront(id);
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Detect snap zones while dragging
      const windowWidth = size.width;
      const windowHeight = size.height;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Snap to left half of screen
      if (newX < 20 && newY < 100) {
        setSnapZone('left');
      } 
      // Snap to right half of screen
      else if (newX + windowWidth > screenWidth - 20 && newY < 100) {
        setSnapZone('right');
      }
      // Snap to top half of screen
      else if (newY < 20) {
        setSnapZone('top');
      }
      // Snap to bottom half of screen
      else if (newY + windowHeight > screenHeight - 20) {
        setSnapZone('bottom');
      }
      // Maximize when dragging to top
      else if (newY < 5) {
        setSnapZone(null);
        onMaximize(id);
      }
      // No snapping
      else {
        setSnapZone(null);
      }
      
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
    
    if (isResizing) {
      e.preventDefault();
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      let newX = position.x;
      let newY = position.y;
      
      // Handle resizing based on direction
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(200, resizeStartSize.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        newWidth = Math.max(200, resizeStartSize.width - deltaX);
        newX = resizeStartPos.x + deltaX;
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(100, resizeStartSize.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        newHeight = Math.max(100, resizeStartSize.height - deltaY);
        newY = resizeStartPos.y + deltaY;
      }
      
      setSize({ width: newWidth, height: newHeight });
      
      if (resizeDirection.includes('w') || resizeDirection.includes('n')) {
        setPosition({ x: newX, y: newY });
      }
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      
      // Apply snapped state if in a snap zone
      if (snapZone) {
        if (snapZone === 'left') {
          setPosition({ x: 0, y: 24 });
          setSize({ width: window.innerWidth / 2, height: window.innerHeight - 24 });
        } else if (snapZone === 'right') {
          setPosition({ x: window.innerWidth / 2, y: 24 });
          setSize({ width: window.innerWidth / 2, height: window.innerHeight - 24 });
        } else if (snapZone === 'top') {
          setPosition({ x: 0, y: 24 });
          setSize({ width: window.innerWidth, height: (window.innerHeight - 24) / 2 });
        } else if (snapZone === 'bottom') {
          setPosition({ x: 0, y: 24 + (window.innerHeight - 24) / 2 });
          setSize({ width: window.innerWidth, height: (window.innerHeight - 24) / 2 });
        }
      }
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
    }
  };
  
  // Start resizing the window
  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: size.width, height: size.height });
  };
  
  // Activate window on click
  const handleWindowClick = () => {
    bringToFront(id);
  };
  
  // Double click on header to maximize/restore
  const handleHeaderDoubleClick = () => {
    onMaximize(id);
  };
  
  // Add event listeners for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isResizing, resizeDirection]);
  
  // Create the window in a portal
  return createPortal(
    <div 
      ref={windowRef}
      className={windowClasses}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: isActive ? 100 : 10
      }}
      onMouseDown={handleMouseDown}
      onClick={handleWindowClick}
    >
      <div ref={headerRef} className="optra-window-header" onDoubleClick={handleHeaderDoubleClick}>
        <div className="optra-window-controls">
          <button 
            className="optra-window-close optra-window-control" 
            onClick={() => onClose(id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <button 
            className="optra-window-minimize optra-window-control" 
            onClick={() => onMinimize(id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button 
            className="optra-window-maximize optra-window-control" 
            onClick={() => onMaximize(id)}
          >
            {isMaximized ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="15" y1="9" x2="15" y2="15"></line><line x1="9" y1="15" x2="15" y2="15"></line><line x1="9" y1="9" x2="9" y2="15"></line></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            )}
          </button>
        </div>
        <div className="optra-window-title">{title}</div>
      </div>
      <div className="optra-window-content" style={{ height: 'calc(100% - 28px)', overflow: 'auto' }}>
        {children}
      </div>
      
      {/* Resize handles */}
      <div className="optra-resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')}></div>
      <div className="optra-resize-handle-w" onMouseDown={(e) => handleResizeStart(e, 'w')}></div>
      <div className="optra-resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')}></div>
      <div className="optra-resize-handle-n" onMouseDown={(e) => handleResizeStart(e, 'n')}></div>
      <div className="optra-resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')}></div>
      <div className="optra-resize-handle-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')}></div>
      <div className="optra-resize-handle-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')}></div>
      <div className="optra-resize-handle-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')}></div>
    </div>,
    document.getElementById('window-container')
  );
}

// TabGroup component for tabbed windows
function TabGroup({ windows, activeTabId, onTabChange, onTabClose, onTabAdd }) {
  return (
    <div className="optra-tab-group">
      <div className="optra-tab-group-header">
        {windows.map(window => (
          <div 
            key={window.id} 
            className={`optra-tab ${window.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabChange(window.id)}
          >
            {window.title}
            <span className="optra-tab-close" onClick={(e) => {
              e.stopPropagation();
              onTabClose(window.id);
            }}>×</span>
          </div>
        ))}
        <div className="optra-tab-add" onClick={onTabAdd}>+</div>
      </div>
      <div className="optra-tab-group-content">
        {windows.find(w => w.id === activeTabId)?.content}
      </div>
    </div>
  );
}

// MinimizedWindow component
function MinimizedWindow({ window, onRestore }) {
  return (
    <div className="optra-minimized-window" onClick={() => onRestore(window.id)}>
      <div className="optra-minimized-title">{window.title}</div>
      <div className="optra-minimized-content"></div>
    </div>
  );
}

// MarketDataTable component
function MarketDataTable({ data, type }) {
  // Customize columns based on type
  const getColumns = () => {
    if (type === 'macro') {
      return [
        { key: 'ticker', label: 'Ticker' },
        { key: 'price', label: 'Price' },
        { key: 'change', label: 'Change' },
        { key: 'changePct', label: 'Change %' },
        { key: 'day', label: 'Day' },
        { key: 'week', label: 'Week' },
        { key: 'month', label: 'Month' },
        { key: 'ytd', label: 'YTD' }
      ];
    } else if (type === 'sector') {
      return [
        { key: 'ticker', label: 'Ticker' },
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price' },
        { key: 'change', label: 'Change' },
        { key: 'changePct', label: 'Change %' }
      ];
    }
    
    // Default columns
    return [
      { key: 'ticker', label: 'Ticker' },
      { key: 'price', label: 'Price' },
      { key: 'change', label: 'Change' },
      { key: 'changePct', label: 'Change %' }
    ];
  };
  
  const columns = getColumns();
  
  // Format number with color based on sign
  const formatNumber = (value, pct = false) => {
    const formatted = pct 
      ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` 
      : `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    
    const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
    
    return <span className={className}>{formatted}</span>;
  };
  
  return (
    <div className="optra-grid-container">
      <table className="optra-grid">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map(col => (
                <td key={col.key}>
                  {col.key === 'ticker' || col.key === 'name'
                    ? row[col.key]
                    : col.key === 'price'
                      ? row[col.key]?.toFixed(2)
                      : col.key === 'changePct'
                        ? formatNumber(row[col.key], true)
                        : formatNumber(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Chart component
function Chart({ data, ticker }) {
  const chartRef = React.useRef(null);
  
  useEffect(() => {
    if (data && data.length > 0 && chartRef.current) {
      // This is a placeholder for chart implementation
      // We'll typically use a library like Recharts, Chart.js, or D3.js
      const ctx = chartRef.current.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height);
      
      // Calculate min/max for scaling
      const prices = data.map(d => d.close);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min;
      
      // Draw chart background
      ctx.fillStyle = '#2d3035';
      ctx.fillRect(0, 0, chartRef.current.width, chartRef.current.height);
      
      // Draw axes
      ctx.strokeStyle = '#4c5058';
      ctx.beginPath();
      ctx.moveTo(40, 10);
      ctx.lineTo(40, chartRef.current.height - 30);
      ctx.lineTo(chartRef.current.width - 10, chartRef.current.height - 30);
      ctx.stroke();
      
      // Draw price line
      ctx.strokeStyle = '#ffcc00';
      ctx.beginPath();
      
      data.forEach((point, i) => {
        const x = 40 + (i / (data.length - 1)) * (chartRef.current.width - 50);
        const y = chartRef.current.height - 30 - ((point.close - min) / range) * (chartRef.current.height - 40);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw ticker name
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '14px Arial';
      ctx.fillText(ticker, 10, 20);
      
      // Draw price
      const lastPrice = data[data.length - 1].close;
      ctx.fillText(`$${lastPrice.toFixed(2)}`, 10, 40);
    }
  }, [data, ticker]);
  
  return (
    <div className="optra-chart">
      <canvas 
        ref={chartRef} 
        width="600" 
        height="400"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// LogViewer component
function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ level: '', source: '' });
  const [isLive, setIsLive] = useState(true);
  
  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
    
    // Set up polling for live updates
    const interval = setInterval(() => {
      if (isLive) {
        fetchLogs();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive, filter]);
  
  // Fetch logs from API
  const fetchLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter.level) queryParams.append('level', filter.level);
      if (filter.source) queryParams.append('source', filter.source);
      
      const response = await fetch(`${BACKEND_URL}/logs?${queryParams.toString()}`);
      const data = await response.json();
      setLogs(data.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };
  
  // Log level badge with color
  const LogLevelBadge = ({ level }) => {
    const colorMap = {
      ERROR: 'bg-red-600',
      WARNING: 'bg-yellow-500',
      INFO: 'bg-blue-500',
      DEBUG: 'bg-gray-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs ${colorMap[level] || 'bg-gray-500'}`}>
        {level}
      </span>
    );
  };
  
  return (
    <div className="optra-log-viewer">
      <div className="optra-log-controls">
        <div className="flex space-x-4 mb-4">
          <select 
            value={filter.level} 
            onChange={e => setFilter({...filter, level: e.target.value})}
            className="bg-optra-darker border border-optra-light rounded px-2 py-1"
          >
            <option value="">All Levels</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="DEBUG">Debug</option>
          </select>
          
          <select 
            value={filter.source} 
            onChange={e => setFilter({...filter, source: e.target.value})}
            className="bg-optra-darker border border-optra-light rounded px-2 py-1"
          >
            <option value="">All Sources</option>
            <option value="system">System</option>
            <option value="market_api">Market API</option>
            <option value="user">User</option>
          </select>
          
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 rounded ${isLive ? 'bg-optra-green' : 'bg-optra-dark border border-optra-light'}`}
          >
            {isLive ? 'Live' : 'Paused'}
          </button>
          
          <button 
            onClick={fetchLogs}
            className="bg-optra-blue px-3 py-1 rounded"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="optra-log-list">
        {logs.map(log => (
          <div key={log._id} className="optra-log-entry border-b border-optra-dark py-2">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center space-x-2">
                <LogLevelBadge level={log.level} />
                <span className="text-optra-light">{log.source}</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="text-optra-light">{log.message}</div>
            {log.stack_trace && (
              <pre className="text-xs bg-optra-darker p-2 mt-1 rounded overflow-x-auto">
                {log.stack_trace}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// SecurityMonitor component (placeholder for now)
function SecurityMonitor() {
  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Security Monitor</h2>
      <div className="bg-optra-darker p-4 rounded">
        <p className="text-optra-light">Security monitoring module will be implemented in the next release.</p>
      </div>
    </div>
  );
}

// MockData for development
const mockMarketData = {
  macro: [
    { ticker: 'USDJPY', price: 145.70, change: 0.03, changePct: 0.02, day: 7.9, week: 17.4, month: 15.9, ytd: 13.1 },
    { ticker: 'EURUSD', price: 1.11, change: -0.01, changePct: -0.21, day: -0.3, week: 11.2, month: 12.4, ytd: 11.3 },
    { ticker: 'USGG10YR', price: 4.11, change: 0.03, changePct: 0.77, day: -0.6, week: 21.0, month: 19.1, ytd: 16.4 },
    { ticker: 'USGG2YR', price: 3.99, change: 0.04, changePct: 0.98, day: -5.7, week: 30.8, month: 28.0, ytd: 24.5 },
    { ticker: 'USGG5YR', price: 4.09, change: 0.04, changePct: 0.96, day: -5.6, week: 25.6, month: 23.9, ytd: 20.8 },
    { ticker: 'USGG10YR', price: 4.47, change: 0.05, changePct: 1.03, day: -2.0, week: 24.1, month: 24.4, ytd: 22.6 },
    { ticker: 'DXY', price: 101.09, change: 0.21, changePct: 0.21, day: -6.8, week: 11.7, month: 11.2, ytd: 10.1 },
    { ticker: 'CL1', price: 86.07, change: 0.10, changePct: 0.12, day: -3.6, week: 22.8, month: 24.1, ytd: 23.0 },
    { ticker: 'GOLDS', price: 3203.65, change: -36.4, changePct: -1.13, day: 22.5, week: 32.1, month: 31.4, ytd: 24.3 }
  ],
  asia: [
    { ticker: 'AS51', price: 8343.68, change: 46.2, changePct: 0.56, day: 2.3, week: 5.5, month: 24.3, ytd: 19.2 },
    { ticker: 'XPMS', price: 8360.0, change: -7.00, changePct: -0.08, day: 1.7, week: 2.6, month: 25.4, ytd: 20.3 },
    { ticker: 'NKY', price: 37753.72, change: -179, changePct: -0.47, day: -5.4, week: 14.8, month: 47.3, ytd: 35.9 },
    { ticker: 'TPX', price: 2740.45, change: 1.49, changePct: 0.05, day: -1.6, week: 11.4, month: 45.5, ytd: 34.2 }
  ],
  us: [
    { ticker: 'SPX', price: 5958.3, change: 41.4, changePct: 0.70, day: 1.3, week: 20.2, month: 33.2, ytd: 28.0 },
    { ticker: 'ES1', price: 5975.50, change: 42.2, changePct: 0.71, day: -0.3, week: 17.9, month: 34.9, ytd: 27.8 },
    { ticker: 'NDX', price: 21506.00, change: 105, changePct: 0.49, day: 0.2, week: 22.1, month: 42.8, ytd: 34.2 },
    { ticker: 'RTY', price: 2113.25, change: 18.5, changePct: 0.89, day: -5.2, week: 24.2, month: 36.7, ytd: 29.9 },
    { ticker: 'INDU', price: 42654.74, change: 331, changePct: 0.78, day: 0.3, week: 18.9, month: 30.9, ytd: 24.2 }
  ]
};

// Mock chart data
const mockChartData = [
  { date: '2025-03-01', open: 144.0, high: 145.0, low: 143.5, close: 144.5, volume: 1000000 },
  { date: '2025-03-02', open: 144.5, high: 146.0, low: 144.0, close: 145.2, volume: 1200000 },
  { date: '2025-03-03', open: 145.2, high: 146.2, low: 144.9, close: 145.0, volume: 900000 },
  { date: '2025-03-04', open: 145.0, high: 145.6, low: 144.9, close: 145.3, volume: 800000 },
  { date: '2025-03-05', open: 145.3, high: 146.0, low: 145.0, close: 145.5, volume: 1100000 },
  { date: '2025-03-06', open: 145.5, high: 145.7, low: 144.8, close: 145.1, volume: 950000 },
  { date: '2025-03-07', open: 145.1, high: 145.8, low: 144.9, close: 145.7, volume: 1050000 }
];

// Main App component
function App() {
  // State for windows and layouts
  const [windows, setWindows] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [activeModule, setActiveModule] = useState(null);
  const [tabGroups, setTabGroups] = useState([]);
  const [minimizedWindows, setMinimizedWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  
  // Load saved layouts on mount
  useEffect(() => {
    fetchLayouts();
  }, []);
  
  // Fetch layouts from API
  const fetchLayouts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/layouts`);
      if (response.ok) {
        const data = await response.json();
        setLayouts(data);
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
    }
  };
  
  // Save current layout
  const saveLayout = async (name, description = '') => {
    const layoutToSave = {
      name,
      description,
      layout: {
        windows: windows.map(window => ({
          id: window.id,
          title: window.title,
          module: window.module,
          position: window.position,
          size: window.size,
          isMaximized: window.isMaximized,
          isMinimized: window.isMinimized
        })),
        tabGroups: tabGroups.map(group => ({
          id: group.id,
          tabs: group.tabs,
          activeTabId: group.activeTabId,
          position: group.position,
          size: group.size
        }))
      }
    };
    
    try {
      const response = await fetch(`${BACKEND_URL}/layouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(layoutToSave)
      });
      
      if (response.ok) {
        const savedLayout = await response.json();
        setLayouts([...layouts, savedLayout]);
      }
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };
  
  // Load a saved layout
  const loadLayout = async (layoutId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/layouts/${layoutId}`);
      if (response.ok) {
        const layout = await response.json();
        
        // Close all current windows and tab groups
        setWindows([]);
        setTabGroups([]);
        setMinimizedWindows([]);
        
        // Open windows from layout
        if (layout.layout && layout.layout.windows) {
          const newWindows = layout.layout.windows.map(window => ({
            ...window,
            id: window.id || uuidv4(),
            zIndex: nextZIndex + windows.length
          }));
          
          setWindows(newWindows);
          setNextZIndex(nextZIndex + newWindows.length);
        }
        
        // Restore tab groups if they exist
        if (layout.layout && layout.layout.tabGroups) {
          setTabGroups(layout.layout.tabGroups.map(group => ({
            ...group,
            id: group.id || uuidv4()
          })));
        }
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    }
  };
  
  // Create a new window
  const createWindow = (module, title, initialPosition, initialSize) => {
    const newWindow = {
      id: uuidv4(),
      title,
      module,
      position: initialPosition || { x: Math.random() * 100 + 50, y: Math.random() * 100 + 50 },
      size: initialSize || { width: 800, height: 600 },
      isMaximized: false,
      isMinimized: false,
      zIndex: nextZIndex
    };
    
    setNextZIndex(nextZIndex + 1);
    setWindows([...windows, newWindow]);
    return newWindow.id;
  };
  
  // Close a window
  const closeWindow = (windowId) => {
    console.log("Closing window:", windowId);
    setWindows(windows.filter(window => window.id !== windowId));
    
    // Also remove from minimized windows if it's there
    setMinimizedWindows(minimizedWindows.filter(window => window.id !== windowId));
  };
  
  // Minimize a window
  const minimizeWindow = (windowId) => {
    const windowToMinimize = windows.find(w => w.id === windowId);
    if (windowToMinimize) {
      // Add to minimized windows array
      setMinimizedWindows([...minimizedWindows, {
        id: windowId,
        title: windowToMinimize.title,
        module: windowToMinimize.module
      }]);
      
      // Update window state
      setWindows(windows.map(w => 
        w.id === windowId 
          ? {...w, isMinimized: true} 
          : w
      ));
    }
  };
  
  // Restore a minimized window
  const restoreWindow = (windowId) => {
    // Remove from minimized array
    setMinimizedWindows(minimizedWindows.filter(w => w.id !== windowId));
    
    // Update window state and bring to front
    setWindows(windows.map(w => 
      w.id === windowId 
        ? {...w, isMinimized: false, zIndex: nextZIndex} 
        : w
    ));
    
    setNextZIndex(nextZIndex + 1);
  };
  
  // Maximize/restore a window
  const toggleMaximize = (windowId) => {
    setWindows(windows.map(w => 
      w.id === windowId 
        ? {...w, isMaximized: !w.isMaximized, zIndex: nextZIndex} 
        : w
    ));
    
    setNextZIndex(nextZIndex + 1);
  };
  
  // Create a tab group with the given windows
  const createTabGroup = (windowIds) => {
    if (windowIds.length < 2) return;
    
    const windowsForGroup = windows.filter(w => windowIds.includes(w.id));
    if (windowsForGroup.length < 2) return;
    
    const firstWindow = windowsForGroup[0];
    const newTabGroup = {
      id: uuidv4(),
      tabs: windowsForGroup.map(w => ({
        id: w.id,
        title: w.title,
        module: w.module
      })),
      activeTabId: firstWindow.id,
      position: firstWindow.position,
      size: firstWindow.size
    };
    
    // Remove the windows from the windows array
    setWindows(windows.filter(w => !windowIds.includes(w.id)));
    
    // Add the new tab group
    setTabGroups([...tabGroups, newTabGroup]);
  };
  
  // Close a tab group
  const closeTabGroup = (groupId) => {
    setTabGroups(tabGroups.filter(group => group.id !== groupId));
  };
  
  // Bring a window to the front
  const bringToFront = (windowId) => {
    setWindows(windows.map(w => 
      w.id === windowId 
        ? {...w, zIndex: nextZIndex} 
        : w
    ));
    
    setNextZIndex(nextZIndex + 1);
  };
  
  // Open module windows
  const openMarketDataModule = () => {
    setActiveModule('market');
    createWindow('marketData', 'Market Data', { x: 50, y: 50 }, { width: 800, height: 600 });
  };
  
  const openChartModule = () => {
    setActiveModule('chart');
    createWindow('chart', 'Chart - USDJPY', { x: 100, y: 100 }, { width: 600, height: 400 });
  };
  
  const openLogModule = () => {
    setActiveModule('log');
    createWindow('log', 'Log Viewer', { x: 150, y: 150 }, { width: 900, height: 600 });
  };
  
  const openSecurityModule = () => {
    setActiveModule('security');
    createWindow('security', 'Security Monitor', { x: 200, y: 200 }, { width: 700, height: 500 });
  };
  
  // Window content based on module
  const getWindowContent = (module) => {
    switch (module) {
      case 'marketData':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Macro</h2>
              <MarketDataTable data={mockMarketData.macro} type="macro" />
            </div>
            
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">US</h2>
              <MarketDataTable data={mockMarketData.us} type="sector" />
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-2">Asia</h2>
              <MarketDataTable data={mockMarketData.asia} type="sector" />
            </div>
          </div>
        );
        
      case 'chart':
        return (
          <div className="p-4 h-full">
            <Chart data={mockChartData} ticker="USDJPY" />
          </div>
        );
        
      case 'log':
        return (
          <div className="p-4 h-full">
            <LogViewer />
          </div>
        );
        
      case 'security':
        return (
          <div className="p-4 h-full">
            <SecurityMonitor />
          </div>
        );
        
      default:
        return <div>Unknown module</div>;
    }
  };
  
  // Window manager value for context
  const windowManagerValue = {
    windows,
    createWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    bringToFront,
    createTabGroup
  };
  
  // Data context value
  const dataValue = {
    marketData: mockMarketData,
    chartData: mockChartData
  };
  
  // Create a new layout with a prompt
  const handleSaveLayout = () => {
    const name = prompt('Enter a name for this layout:', 'My Layout');
    if (name) {
      const description = prompt('Enter a description (optional):', '');
      saveLayout(name, description || '');
    }
  };
  
  return (
    <WindowManagerContext.Provider value={windowManagerValue}>
      <DataContext.Provider value={dataValue}>
        <div className="app">
          {/* macOS-like menu bar */}
          <div className="optra-menu-bar">
            <div className="optra-menu-logo">optra</div>
            
            <div className="optra-menu-item">
              File
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item" onClick={handleSaveLayout}>
                  Save Layout
                  <span className="optra-dropdown-shortcut">⌘S</span>
                </div>
                <div className="optra-dropdown-item">
                  Save Layout As...
                  <span className="optra-dropdown-shortcut">⇧⌘S</span>
                </div>
                <div className="optra-dropdown-divider"></div>
                <div className="optra-dropdown-item">
                  Export Data...
                  <span className="optra-dropdown-shortcut">⌘E</span>
                </div>
                <div className="optra-dropdown-divider"></div>
                <div className="optra-dropdown-item">
                  Exit
                  <span className="optra-dropdown-shortcut">⌘Q</span>
                </div>
              </div>
            </div>
            
            <div className="optra-menu-item">
              Edit
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item">
                  Cut
                  <span className="optra-dropdown-shortcut">⌘X</span>
                </div>
                <div className="optra-dropdown-item">
                  Copy
                  <span className="optra-dropdown-shortcut">⌘C</span>
                </div>
                <div className="optra-dropdown-item">
                  Paste
                  <span className="optra-dropdown-shortcut">⌘V</span>
                </div>
              </div>
            </div>
            
            <div className="optra-menu-item">
              View
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item">
                  Zoom In
                  <span className="optra-dropdown-shortcut">⌘+</span>
                </div>
                <div className="optra-dropdown-item">
                  Zoom Out
                  <span className="optra-dropdown-shortcut">⌘-</span>
                </div>
                <div className="optra-dropdown-divider"></div>
                <div className="optra-dropdown-item">
                  Toggle Dark Mode
                </div>
              </div>
            </div>
            
            <div className="optra-menu-item">
              Modules
              <div className="optra-dropdown-menu">
                <div 
                  className={`optra-dropdown-item ${activeModule === 'market' ? 'active' : ''}`}
                  onClick={openMarketDataModule}
                >
                  Market Data
                </div>
                <div 
                  className={`optra-dropdown-item ${activeModule === 'chart' ? 'active' : ''}`}
                  onClick={openChartModule}
                >
                  Chart
                </div>
                <div 
                  className={`optra-dropdown-item ${activeModule === 'log' ? 'active' : ''}`}
                  onClick={openLogModule}
                >
                  Log Viewer
                </div>
                <div 
                  className={`optra-dropdown-item ${activeModule === 'security' ? 'active' : ''}`}
                  onClick={openSecurityModule}
                >
                  Security Monitor
                </div>
              </div>
            </div>
            
            <div className="optra-menu-item">
              Layout
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item" onClick={handleSaveLayout}>
                  Save Current Layout
                </div>
                <div className="optra-dropdown-divider"></div>
                {layouts.length > 0 ? (
                  layouts.map(layout => (
                    <div 
                      key={layout.id} 
                      className="optra-dropdown-item"
                      onClick={() => loadLayout(layout.id)}
                    >
                      {layout.name}
                    </div>
                  ))
                ) : (
                  <div className="optra-dropdown-item" style={{ opacity: 0.5, cursor: 'default' }}>
                    No saved layouts
                  </div>
                )}
              </div>
            </div>
            
            <div className="optra-menu-item">
              Window
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item">
                  Tile All Windows
                </div>
                <div className="optra-dropdown-item">
                  Cascade Windows
                </div>
                <div className="optra-dropdown-divider"></div>
                <div className="optra-dropdown-item">
                  Minimize All
                </div>
                <div className="optra-dropdown-item">
                  Close All
                </div>
              </div>
            </div>
            
            <div className="optra-menu-item">
              Settings
              <div className="optra-dropdown-menu">
                <div className="optra-dropdown-item">
                  Preferences
                </div>
                <div className="optra-dropdown-item">
                  API Connections
                </div>
                <div className="optra-dropdown-item">
                  Hotkeys
                </div>
              </div>
            </div>
          </div>
          
          {/* Window container */}
          <div className="optra-window-container">
            {windows.map(window => (
              !window.isMinimized && (
                <Window
                  key={window.id}
                  id={window.id}
                  title={window.title}
                  initialPosition={window.position}
                  initialSize={window.size}
                  module={window.module}
                  isMaximized={window.isMaximized}
                  isMinimized={window.isMinimized}
                  onClose={closeWindow}
                  onMinimize={minimizeWindow}
                  onMaximize={toggleMaximize}
                  bringToFront={bringToFront}
                >
                  {getWindowContent(window.module)}
                </Window>
              )
            ))}
            
            {/* Tab groups */}
            {tabGroups.map(group => (
              <div
                key={group.id}
                className="optra-tab-group"
                style={{
                  position: 'absolute',
                  left: group.position.x,
                  top: group.position.y,
                  width: group.size.width,
                  height: group.size.height,
                  zIndex: 50 // Below normal windows
                }}
              >
                <div className="optra-tab-group-header">
                  {group.tabs.map(tab => (
                    <div
                      key={tab.id}
                      className={`optra-tab ${tab.id === group.activeTabId ? 'active' : ''}`}
                      onClick={() => {
                        setTabGroups(tabGroups.map(g => 
                          g.id === group.id 
                            ? {...g, activeTabId: tab.id} 
                            : g
                        ));
                      }}
                    >
                      {tab.title}
                    </div>
                  ))}
                </div>
                <div className="optra-tab-group-content">
                  {getWindowContent(group.tabs.find(t => t.id === group.activeTabId)?.module)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Minimized windows */}
          {minimizedWindows.length > 0 && (
            <div className="optra-minimized-windows">
              {minimizedWindows.map(window => (
                <div 
                  key={window.id} 
                  className="optra-minimized-window"
                  onClick={() => restoreWindow(window.id)}
                >
                  <div className="optra-minimized-title">{window.title}</div>
                  <div className="optra-minimized-content" />
                </div>
              ))}
            </div>
          )}
          
          {/* Dock */}
          <div className="optra-dock-container">
            <div 
              className={`optra-dock-item ${activeModule === 'market' ? 'active' : ''}`}
              onClick={openMarketDataModule}
              title="Market Data"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </div>
            <div 
              className={`optra-dock-item ${activeModule === 'chart' ? 'active' : ''}`}
              onClick={openChartModule}
              title="Chart"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <div 
              className={`optra-dock-item ${activeModule === 'log' ? 'active' : ''}`}
              onClick={openLogModule}
              title="Log Viewer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div 
              className={`optra-dock-item ${activeModule === 'security' ? 'active' : ''}`}
              onClick={openSecurityModule}
              title="Security Monitor"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
          </div>
        </div>
      </DataContext.Provider>
    </WindowManagerContext.Provider>
  );
}

export default App;
