from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from typing import Dict, List, Optional, Any, Union
import os
import json
import uuid
import datetime
import logging
import asyncio
import yfinance as yf
import pandas as pd
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("optra")

# MongoDB connection
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017/optra")
client = MongoClient(mongo_url)
db = client.optra

# Create FastAPI app
app = FastAPI(title="Optra Backend API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.ticker_subscriptions: Dict[str, List[str]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Clean up subscriptions
        for ticker, subscribers in list(self.ticker_subscriptions.items()):
            if client_id in subscribers:
                subscribers.remove(client_id)
                if not subscribers:
                    del self.ticker_subscriptions[ticker]
    
    def subscribe_to_ticker(self, client_id: str, ticker: str):
        if ticker not in self.ticker_subscriptions:
            self.ticker_subscriptions[ticker] = []
        if client_id not in self.ticker_subscriptions[ticker]:
            self.ticker_subscriptions[ticker].append(client_id)
            
    def unsubscribe_from_ticker(self, client_id: str, ticker: str):
        if ticker in self.ticker_subscriptions and client_id in self.ticker_subscriptions[ticker]:
            self.ticker_subscriptions[ticker].remove(client_id)
            if not self.ticker_subscriptions[ticker]:
                del self.ticker_subscriptions[ticker]
                
    async def broadcast_to_ticker_subscribers(self, ticker: str, data: dict):
        if ticker in self.ticker_subscriptions:
            for client_id in self.ticker_subscriptions[ticker]:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_json(data)

manager = ConnectionManager()

# Pydantic models
class LogEntry(BaseModel):
    source: str
    level: str
    message: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
    stack_trace: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
    
class WindowLayout(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    layout: Dict[str, Any]
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.now)
    
class TickerSubscription(BaseModel):
    ticker: str

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}

# Logging endpoints
@app.post("/api/logs")
async def add_log(log_entry: LogEntry):
    result = db.logs.insert_one(log_entry.dict())
    log_dict = log_entry.dict()
    log_dict["_id"] = str(result.inserted_id)
    return log_dict

@app.get("/api/logs")
async def get_logs(
    limit: int = 100, 
    offset: int = 0, 
    level: Optional[str] = None, 
    source: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    # Build query
    query = {}
    if level:
        query["level"] = level
    if source:
        query["source"] = source
    if from_date:
        query["timestamp"] = {"$gte": datetime.datetime.fromisoformat(from_date)}
    if to_date:
        if "timestamp" not in query:
            query["timestamp"] = {}
        query["timestamp"]["$lte"] = datetime.datetime.fromisoformat(to_date)
        
    # Execute query
    logs = list(db.logs.find(query).sort("timestamp", -1).skip(offset).limit(limit))
    
    # Convert ObjectId to string
    for log in logs:
        log["_id"] = str(log["_id"])
        
    return {
        "data": logs,
        "total": db.logs.count_documents(query),
        "limit": limit,
        "offset": offset
    }

# Layout management endpoints
@app.post("/api/layouts")
async def save_layout(layout: WindowLayout):
    layout_dict = layout.dict()
    if layout.id:
        # Update existing layout
        db.layouts.update_one(
            {"id": layout.id},
            {"$set": {
                "name": layout.name,
                "description": layout.description,
                "layout": layout.layout,
                "updated_at": datetime.datetime.now()
            }}
        )
    else:
        # Create new layout
        result = db.layouts.insert_one(layout_dict)
    
    return layout_dict

@app.get("/api/layouts")
async def get_layouts():
    layouts = list(db.layouts.find({}))
    # Convert ObjectId to string
    for layout in layouts:
        layout["_id"] = str(layout["_id"])
    return layouts

@app.get("/api/layouts/{layout_id}")
async def get_layout(layout_id: str):
    layout = db.layouts.find_one({"id": layout_id})
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    layout["_id"] = str(layout["_id"])
    return layout

@app.delete("/api/layouts/{layout_id}")
async def delete_layout(layout_id: str):
    result = db.layouts.delete_one({"id": layout_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found")
    return {"status": "success", "message": "Layout deleted"}

# Yahoo Finance data endpoints
@app.get("/api/market/quote/{ticker}")
async def get_quote(ticker: str):
    try:
        ticker_obj = yf.Ticker(ticker)
        info = ticker_obj.info
        
        # Log the API call
        await add_log(LogEntry(
            source="market_api",
            level="INFO",
            message=f"Quote requested for {ticker}",
            additional_data={"ticker": ticker}
        ))
        
        # Return a subset of the data for a cleaner response
        return {
            "ticker": ticker,
            "name": info.get("shortName", ""),
            "price": info.get("currentPrice", 0),
            "change": info.get("regularMarketChange", 0),
            "change_percent": info.get("regularMarketChangePercent", 0),
            "volume": info.get("regularMarketVolume", 0),
            "market_cap": info.get("marketCap", 0),
            "exchange": info.get("exchange", ""),
            "currency": info.get("currency", "USD"),
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching quote for {ticker}: {str(e)}")
        # Log the error
        await add_log(LogEntry(
            source="market_api",
            level="ERROR",
            message=f"Error fetching quote for {ticker}",
            stack_trace=str(e),
            additional_data={"ticker": ticker}
        ))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/history/{ticker}")
async def get_history(
    ticker: str, 
    period: str = "1mo",  # 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    interval: str = "1d"  # 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
):
    try:
        ticker_obj = yf.Ticker(ticker)
        history = ticker_obj.history(period=period, interval=interval)
        
        # Format the data for the frontend
        data = []
        for index, row in history.iterrows():
            data.append({
                "date": index.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
            
        # Log the API call
        await add_log(LogEntry(
            source="market_api",
            level="INFO",
            message=f"History requested for {ticker}",
            additional_data={"ticker": ticker, "period": period, "interval": interval}
        ))
        
        return {
            "ticker": ticker,
            "period": period,
            "interval": interval,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error fetching history for {ticker}: {str(e)}")
        # Log the error
        await add_log(LogEntry(
            source="market_api",
            level="ERROR",
            message=f"Error fetching history for {ticker}",
            stack_trace=str(e),
            additional_data={"ticker": ticker, "period": period, "interval": interval}
        ))
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/api/market/search/{query}")
async def search_tickers(query: str):
    try:
        # Simple search using yfinance (limited capabilities)
        tickers = yf.Tickers(query)
        results = []
        
        for ticker_symbol in tickers.tickers:
            try:
                ticker = tickers.tickers[ticker_symbol]
                info = ticker.info
                
                results.append({
                    "symbol": ticker_symbol,
                    "name": info.get("shortName", ""),
                    "exchange": info.get("exchange", ""),
                    "type": info.get("quoteType", ""),
                    "currency": info.get("currency", "USD")
                })
            except:
                # Skip tickers that fail to load
                pass
                
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching tickers for {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time updates
@app.websocket("/api/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        # Continuously check for messages from the client
        while True:
            data = await websocket.receive_json()
            
            # Handle subscription requests
            if data.get("action") == "subscribe":
                ticker = data.get("ticker")
                if ticker:
                    manager.subscribe_to_ticker(client_id, ticker)
                    await websocket.send_json({
                        "type": "subscription",
                        "status": "success",
                        "ticker": ticker
                    })
                    
            elif data.get("action") == "unsubscribe":
                ticker = data.get("ticker")
                if ticker:
                    manager.unsubscribe_from_ticker(client_id, ticker)
                    await websocket.send_json({
                        "type": "unsubscription",
                        "status": "success",
                        "ticker": ticker
                    })
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)

# Background task to simulate real-time updates
async def update_ticker_prices():
    while True:
        # Only fetch data for tickers that have active subscriptions
        tickers = list(manager.ticker_subscriptions.keys())
        if tickers:
            try:
                # Batch request to Yahoo Finance
                tickers_str = " ".join(tickers)
                data = yf.download(tickers_str, period="1d", interval="1m", group_by="ticker", progress=False)
                
                # Process each ticker
                for ticker in tickers:
                    try:
                        if len(tickers) == 1:
                            ticker_data = data
                        else:
                            ticker_data = data[ticker]
                            
                        latest = ticker_data.iloc[-1]
                        
                        # Send update to subscribers
                        await manager.broadcast_to_ticker_subscribers(ticker, {
                            "type": "price_update",
                            "ticker": ticker,
                            "price": float(latest["Close"]),
                            "change": float(latest["Close"] - ticker_data.iloc[0]["Open"]),
                            "change_percent": float((latest["Close"] / ticker_data.iloc[0]["Open"] - 1) * 100),
                            "volume": int(latest["Volume"]),
                            "timestamp": datetime.datetime.now().isoformat()
                        })
                    except Exception as e:
                        logger.error(f"Error updating ticker {ticker}: {str(e)}")
            except Exception as e:
                logger.error(f"Error in ticker update task: {str(e)}")
                
        # Wait before the next update
        await asyncio.sleep(10)  # Update every 10 seconds

@app.on_event("startup")
async def startup_event():
    # Start background tasks
    asyncio.create_task(update_ticker_prices())
    
    # Log application startup
    db.logs.insert_one({
        "source": "system",
        "level": "INFO",
        "message": "Optra backend started",
        "timestamp": datetime.datetime.now()
    })
    logger.info("Optra backend started")

@app.on_event("shutdown")
async def shutdown_event():
    # Log application shutdown
    db.logs.insert_one({
        "source": "system",
        "level": "INFO",
        "message": "Optra backend shutting down",
        "timestamp": datetime.datetime.now()
    })
    logger.info("Optra backend shutting down")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
