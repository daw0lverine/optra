#!/usr/bin/env python3
import time
import random
import datetime
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API endpoint for logs
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001/api")
LOGS_ENDPOINT = f"{BACKEND_URL}/logs"

# Log sources
SOURCES = [
    "system", 
    "market_api", 
    "user_interface", 
    "database", 
    "data_processor", 
    "authentication", 
    "order_manager",
    "price_feed",
    "security_monitor",
    "network_io",
    "cache_service",
    "task_scheduler"
]

# Log levels
LEVELS = {
    "INFO": 0.6,     # 60% chance
    "WARNING": 0.25, # 25% chance
    "ERROR": 0.1,    # 10% chance
    "DEBUG": 0.05    # 5% chance
}

# Generic message templates
MESSAGES = {
    "INFO": [
        "Successfully processed {count} records",
        "User {user_id} logged in from {ip_address}",
        "Market data feed for {ticker} updated",
        "Scheduled task {task_name} completed in {duration}ms",
        "Cache refreshed for {service} module",
        "Connected to {service} service",
        "Processed request from {client} in {duration}ms",
        "New data available for {ticker}",
        "Configuration loaded successfully",
        "Synchronization completed with {count} updated items",
        "Heartbeat received from {service}",
        "Memory usage at {memory_percent}%, within normal parameters",
        "Incoming connection from {ip_address}",
        "Successfully queried {database} in {duration}ms",
        "User session {session_id} refreshed",
        "Data feed connection healthy, latency {latency}ms"
    ],
    "WARNING": [
        "High latency detected: {latency}ms for {service}",
        "Rate limit approaching for {api_name} API: {rate}/{max_rate}",
        "Memory usage at {memory_percent}%",
        "Database query took {duration}ms, exceeding threshold of 500ms",
        "Retrying connection to {service}, attempt {attempt} of 5",
        "User {user_id} made {count} failed login attempts",
        "Slow response time from {service}: {duration}ms",
        "Data inconsistency detected for {ticker}, using cached data",
        "Network latency with {service} exceeds normal threshold",
        "Database connection pool reaching capacity ({current}/{max})",
        "CPU usage spike: {cpu_percent}%"
    ],
    "ERROR": [
        "Failed to connect to {service} after {attempts} attempts",
        "Database query failed: {error_msg}",
        "Exception in thread {thread_name}: {error_msg}",
        "API request to {endpoint} failed with status {status_code}",
        "Invalid data format received from {source}",
        "Failed to authenticate user {user_id}: {error_msg}",
        "Unexpected response from {service}: {response}",
        "Data processing pipeline failed at stage {stage}: {error_msg}",
        "Connection timeout with {service} after {timeout}s",
        "Failed to update {ticker} price: {error_msg}"
    ],
    "DEBUG": [
        "Variable {var_name} = {var_value}",
        "API request payload: {payload}",
        "Processing {ticker} data with parameters: {params}",
        "Query execution plan: {plan}",
        "Cache hit ratio: {ratio}",
        "Detailed timing breakdown: {timing_details}",
        "Environment variables: {env_vars}",
        "Method {method_name} called with args: {args}",
        "Network packet details: {packet_details}"
    ]
}

# Stack trace templates for error logs
STACK_TRACES = [
    """Traceback (most recent call last):
  File "/app/backend/server.py", line {line}, in {function}
    {code_line}
  File "/app/backend/modules/data_provider.py", line {sub_line}, in get_market_data
    response = session.get(url, timeout=5)
requests.exceptions.ConnectionError: Connection refused by host""",
    
    """Traceback (most recent call last):
  File "/app/backend/server.py", line {line}, in {function}
    {code_line}
  File "/app/backend/database/connector.py", line {sub_line}, in execute_query
    cursor.execute(query, params)
pymongo.errors.OperationFailure: Command failed with error {error_code}: '{error_msg}'""",
    
    """Traceback (most recent call last):
  File "/app/backend/server.py", line {line}, in {function}
    {code_line}
  File "/app/backend/services/data_processor.py", line {sub_line}, in process
    result = transform_data(input_data)
  File "/app/backend/services/data_processor.py", line {third_line}, in transform_data
    return model.predict(processed_data)
ValueError: {error_msg}""",
    
    """Traceback (most recent call last):
  File "/app/backend/server.py", line {line}, in {function}
    {code_line}
  File "/app/backend/api/routes.py", line {sub_line}, in handle_request
    result = await process_async_request(data)
  File "/app/backend/api/handlers.py", line {third_line}, in process_async_request
    response = await client.fetch(request)
asyncio.exceptions.TimeoutError: Timeout while connecting to {service}"""
]

# Random data generators for templates
def random_count():
    return random.randint(1, 1000)

def random_user_id():
    return f"user_{random.randint(1000, 9999)}"

def random_ip_address():
    return f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

def random_ticker():
    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "V", "PYPL", "NFLX", "INTC", "CRM", "CSCO", "PEP"]
    return random.choice(tickers)

def random_duration():
    return random.randint(5, 2000)

def random_task_name():
    tasks = ["data_sync", "cleanup", "report_generation", "email_dispatch", "backup", "index_rebuild", "cache_refresh", "feed_update"]
    return random.choice(tasks)

def random_service():
    services = ["database", "auth", "market_data", "reporting", "user_service", "api_gateway", "pricing", "cache", "redis", "mongodb", "analytics"]
    return random.choice(services)

def random_client():
    clients = ["web", "mobile", "desktop", "api", "internal_service", "admin_panel"]
    return random.choice(clients)

def random_memory_percent():
    return random.randint(30, 95)

def random_session_id():
    return f"sess_{random.randint(10000, 99999)}"

def random_latency():
    return random.randint(10, 1000)

def random_rate():
    max_rate = random.randint(100, 1000)
    current_rate = random.randint(max_rate - 30, max_rate)
    return current_rate, max_rate

def random_api_name():
    apis = ["market_data", "user", "auth", "analytics", "reporting", "pricing", "external_feed"]
    return random.choice(apis)

def random_attempt():
    return random.randint(2, 5)

def random_cpu_percent():
    return random.randint(70, 99)

def random_error_msg():
    msgs = [
        "Connection timeout",
        "Invalid credentials",
        "Resource not found",
        "Permission denied",
        "Data validation failed",
        "Unexpected EOF",
        "Missing required field",
        "Input/output error",
        "Connection reset by peer",
        "Memory allocation failed",
        "Internal server error",
        "Service unavailable",
        "Invalid format",
        "Operation not permitted"
    ]
    return random.choice(msgs)

def random_status_code():
    codes = [400, 401, 403, 404, 500, 502, 503, 504]
    return random.choice(codes)

def random_endpoint():
    endpoints = ["/api/market/data", "/api/user/profile", "/api/auth/token", "/api/reports/generate", "/api/system/status"]
    return random.choice(endpoints)

def random_thread_name():
    threads = ["MainThread", "WorkerThread", "DataProcessorThread", "ConnectionManagerThread", "APIHandlerThread"]
    return random.choice(threads)

def random_response():
    responses = ["{}", "null", "[]", "<html>Error</html>", "Invalid token", "Rate limit exceeded"]
    return random.choice(responses)

def random_stage():
    stages = ["extraction", "transformation", "loading", "validation", "analysis", "report", "notification"]
    return random.choice(stages)

def random_timeout():
    return random.randint(10, 60)

def random_var_name():
    vars = ["config", "data", "result", "response", "request", "user", "token", "status", "options"]
    return random.choice(vars)

def random_var_value():
    values = ["None", "True", "False", "{}", "[]", "''", "0", "settings object", "response object"]
    return random.choice(values)

def random_payload():
    return {"method": "GET", "headers": {"Authorization": "Bearer ***"}, "params": {"filter": "active"}}

def random_params():
    return {"interval": "1d", "limit": 100, "format": "json"}

def random_plan():
    return "SCAN TABLE users WHERE status = 'active'"

def random_ratio():
    return f"{random.randint(60, 95)}%"

def random_timing_details():
    return {"db": f"{random.randint(10, 100)}ms", "processing": f"{random.randint(5, 50)}ms", "network": f"{random.randint(1, 20)}ms"}

def random_env_vars():
    return {"DEBUG": "False", "LOG_LEVEL": "INFO", "TIMEOUT": "30"}

def random_method_name():
    methods = ["get_data", "process_request", "authenticate", "validate_input", "transform", "send_response"]
    return random.choice(methods)

def random_args():
    return {"id": random.randint(1, 1000), "include_details": random.choice([True, False])}

def random_packet_details():
    return {"size": f"{random.randint(100, 5000)} bytes", "protocol": random.choice(["TCP", "UDP", "HTTP"]), "source": random_ip_address()}

def random_line_number():
    return random.randint(10, 500)

def random_function():
    functions = ["handle_request", "process_data", "authenticate_user", "update_market_data", "execute_query", "generate_report"]
    return random.choice(functions)

def random_code_line():
    code_lines = [
        "result = await data_provider.get_market_data(ticker)",
        "response = database.execute_query(query, params)",
        "processed_data = data_processor.process(input_data)",
        "await client.send_request(request_data)",
        "return service.handle_operation(params)"
    ]
    return random.choice(code_lines)

def random_error_code():
    return random.randint(1000, 9999)

# Function to generate a random log entry
def generate_log_entry():
    # Select log level based on probability
    rand = random.random()
    cumulative = 0
    selected_level = "INFO"  # Default
    
    for level, prob in LEVELS.items():
        cumulative += prob
        if rand <= cumulative:
            selected_level = level
            break
    
    # Select a random source
    source = random.choice(SOURCES)
    
    # Select a random message template
    message_template = random.choice(MESSAGES[selected_level])
    
    # Fill in the template
    message = message_template
    
    # Replace placeholders with random values
    if "{count}" in message:
        message = message.replace("{count}", str(random_count()))
    if "{user_id}" in message:
        message = message.replace("{user_id}", random_user_id())
    if "{ip_address}" in message:
        message = message.replace("{ip_address}", random_ip_address())
    if "{ticker}" in message:
        message = message.replace("{ticker}", random_ticker())
    if "{duration}" in message:
        message = message.replace("{duration}", str(random_duration()))
    if "{task_name}" in message:
        message = message.replace("{task_name}", random_task_name())
    if "{service}" in message:
        message = message.replace("{service}", random_service())
    if "{client}" in message:
        message = message.replace("{client}", random_client())
    if "{memory_percent}" in message:
        message = message.replace("{memory_percent}", str(random_memory_percent()))
    if "{session_id}" in message:
        message = message.replace("{session_id}", random_session_id())
    if "{latency}" in message:
        message = message.replace("{latency}", str(random_latency()))
    if "{rate}" in message and "{max_rate}" in message:
        rate, max_rate = random_rate()
        message = message.replace("{rate}", str(rate))
        message = message.replace("{max_rate}", str(max_rate))
    if "{api_name}" in message:
        message = message.replace("{api_name}", random_api_name())
    if "{attempt}" in message or "{attempts}" in message:
        attempt = random_attempt()
        message = message.replace("{attempt}", str(attempt))
        message = message.replace("{attempts}", str(attempt))
    if "{cpu_percent}" in message:
        message = message.replace("{cpu_percent}", str(random_cpu_percent()))
    if "{error_msg}" in message:
        message = message.replace("{error_msg}", random_error_msg())
    if "{status_code}" in message:
        message = message.replace("{status_code}", str(random_status_code()))
    if "{endpoint}" in message:
        message = message.replace("{endpoint}", random_endpoint())
    if "{thread_name}" in message:
        message = message.replace("{thread_name}", random_thread_name())
    if "{response}" in message:
        message = message.replace("{response}", random_response())
    if "{stage}" in message:
        message = message.replace("{stage}", random_stage())
    if "{timeout}" in message:
        message = message.replace("{timeout}", str(random_timeout()))
    if "{database}" in message:
        message = message.replace("{database}", random_service())
    if "{current}" in message and "{max}" in message:
        current = random.randint(80, 100)
        max_val = 100
        message = message.replace("{current}", str(current))
        message = message.replace("{max}", str(max_val))
    if "{var_name}" in message:
        message = message.replace("{var_name}", random_var_name())
    if "{var_value}" in message:
        message = message.replace("{var_value}", random_var_value())
    if "{payload}" in message:
        message = message.replace("{payload}", str(random_payload()))
    if "{params}" in message:
        message = message.replace("{params}", str(random_params()))
    if "{plan}" in message:
        message = message.replace("{plan}", random_plan())
    if "{ratio}" in message:
        message = message.replace("{ratio}", random_ratio())
    if "{timing_details}" in message:
        message = message.replace("{timing_details}", str(random_timing_details()))
    if "{env_vars}" in message:
        message = message.replace("{env_vars}", str(random_env_vars()))
    if "{method_name}" in message:
        message = message.replace("{method_name}", random_method_name())
    if "{args}" in message:
        message = message.replace("{args}", str(random_args()))
    if "{packet_details}" in message:
        message = message.replace("{packet_details}", str(random_packet_details()))
    if "{source}" in message:
        message = message.replace("{source}", random_service())

    # Create the log entry
    log_entry = {
        "source": source,
        "level": selected_level,
        "message": message,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    # Add stack trace for error logs
    if selected_level == "ERROR":
        stack_trace = random.choice(STACK_TRACES)
        line = random_line_number()
        stack_trace = stack_trace.replace("{line}", str(line))
        stack_trace = stack_trace.replace("{function}", random_function())
        stack_trace = stack_trace.replace("{code_line}", random_code_line())
        stack_trace = stack_trace.replace("{sub_line}", str(line + random.randint(10, 50)))
        stack_trace = stack_trace.replace("{third_line}", str(line + random.randint(60, 100)))
        stack_trace = stack_trace.replace("{error_code}", str(random_error_code()))
        stack_trace = stack_trace.replace("{error_msg}", random_error_msg())
        stack_trace = stack_trace.replace("{service}", random_service())
        log_entry["stack_trace"] = stack_trace
    
    # Add additional data for some logs
    if random.random() < 0.3:  # 30% chance to add additional data
        log_entry["additional_data"] = {
            "duration": random_duration(),
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "method": random.choice(["GET", "POST", "PUT", "DELETE"]),
            "path": random.choice(["/api/market", "/api/user", "/api/auth", "/api/system"]),
            "request_id": f"req_{random.randint(10000, 99999)}"
        }
    
    return log_entry

# Main function to generate and send logs
def generate_logs():
    print(f"Starting log generator, sending logs to {LOGS_ENDPOINT}")
    
    while True:
        # Generate between 1-5 log entries
        num_entries = random.randint(1, 5)
        
        for _ in range(num_entries):
            log_entry = generate_log_entry()
            
            try:
                # Send the log entry
                response = requests.post(LOGS_ENDPOINT, json=log_entry)
                if response.status_code == 200:
                    print(f"Sent log: {log_entry['level']} - {log_entry['source']} - {log_entry['message'][:50]}...")
                else:
                    print(f"Failed to send log: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Error sending log: {str(e)}")
        
        # Wait for a random interval between 1-5 seconds
        time.sleep(random.uniform(1, 5))

if __name__ == "__main__":
    generate_logs()
