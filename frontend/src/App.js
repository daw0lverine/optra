import React, { useState, useEffect, createContext, useContext } from 'react';
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

// Window component
function Window({ id, title, children, initialPosition, initialSize, module, onClose }) {
  const [position, setPosition] = useState(initialPosition || { x: 50, y: 50 });
  const [size, setSize] = useState(initialSize || { width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(true);
  
  // Refs for DOM elements
  const windowRef = React.useRef(null);
  const headerRef = React.useRef(null);
  
  // Handle window dragging
  const handleMouseDown = (e) => {
    if (headerRef.current && headerRef.current.contains(e.target)) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsActive(true);
      e.preventDefault();
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Activate window on click
  const handleWindowClick = () => {
    setIsActive(true);
  };
  
  // Add event listeners for dragging
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Create the window in a portal
  return createPortal(
    <div 
      ref={windowRef}
      className={`optra-window ${isActive ? 'active' : ''}`}
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
      <div ref={headerRef} className="optra-window-header">
        <div className="optra-window-title">{title}</div>
        <div className="optra-window-controls">
          <button className="optra-window-minimize" onClick={() => {}}></button>
          <button className="optra-window-maximize" onClick={() => {}}></button>
          <button className="optra-window-close" onClick={onClose}></button>
        </div>
      </div>
      <div className="optra-window-content" style={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
        {children}
      </div>
    </div>,
    document.getElementById('window-container')
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
    if (data && data.length > 0) {
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
          size: window.size
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
        
        // Close all current windows
        setWindows([]);
        
        // Open windows from layout
        if (layout.layout && layout.layout.windows) {
          const newWindows = layout.layout.windows.map(window => ({
            ...window,
            id: window.id || uuidv4()
          }));
          
          setWindows(newWindows);
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
      position: initialPosition,
      size: initialSize
    };
    
    setWindows([...windows, newWindow]);
    return newWindow.id;
  };
  
  // Close a window
  const closeWindow = (windowId) => {
    setWindows(windows.filter(window => window.id !== windowId));
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
  
  // Window content based on module
  const getWindowContent = (module) => {
    switch (module) {
      case 'marketData':
        return (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xl mb-2">Macro</h2>
              <MarketDataTable data={mockMarketData.macro} type="macro" />
            </div>
            
            <div className="mb-4">
              <h2 className="text-xl mb-2">US</h2>
              <MarketDataTable data={mockMarketData.us} type="sector" />
            </div>
            
            <div>
              <h2 className="text-xl mb-2">Asia</h2>
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
        
      default:
        return <div>Unknown module</div>;
    }
  };
  
  // Window manager value for context
  const windowManagerValue = {
    windows,
    createWindow,
    closeWindow
  };
  
  // Data context value
  const dataValue = {
    marketData: mockMarketData,
    chartData: mockChartData
  };
  
  return (
    <WindowManagerContext.Provider value={windowManagerValue}>
      <DataContext.Provider value={dataValue}>
        <div className="app">
          {/* Main app menu */}
          <div className="optra-main-menu">
            <div className="container mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-xl font-bold mr-8">optra</div>
                  
                  <div className="flex space-x-4">
                    <div 
                      className={`optra-main-menu-item ${activeModule === 'market' ? 'active' : ''}`}
                      onClick={openMarketDataModule}
                    >
                      Market Data
                    </div>
                    <div 
                      className={`optra-main-menu-item ${activeModule === 'chart' ? 'active' : ''}`}
                      onClick={openChartModule}
                    >
                      Charts
                    </div>
                    <div 
                      className={`optra-main-menu-item ${activeModule === 'log' ? 'active' : ''}`}
                      onClick={openLogModule}
                    >
                      Logs
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="optra-main-menu-item" onClick={() => saveLayout('Default Layout')}>
                    Save Layout
                  </div>
                  <div className="relative group">
                    <div className="optra-main-menu-item">
                      Load Layout
                    </div>
                    {layouts.length > 0 && (
                      <div className="absolute left-0 mt-2 w-48 bg-optra-dark border border-optra-light rounded shadow-lg z-50 hidden group-hover:block">
                        {layouts.map(layout => (
                          <div 
                            key={layout.id} 
                            className="px-4 py-2 hover:bg-optra-darker cursor-pointer"
                            onClick={() => loadLayout(layout.id)}
                          >
                            {layout.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="optra-main-menu-item">
                    Settings
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Window container */}
          <div className="optra-window-container">
            {windows.map(window => (
              <Window
                key={window.id}
                id={window.id}
                title={window.title}
                initialPosition={window.position}
                initialSize={window.size}
                module={window.module}
                onClose={() => closeWindow(window.id)}
              >
                {getWindowContent(window.module)}
              </Window>
            ))}
          </div>
        </div>
      </DataContext.Provider>
    </WindowManagerContext.Provider>
  );
}

export default App;
