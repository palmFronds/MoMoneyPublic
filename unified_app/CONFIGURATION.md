# 🔧 Configuration Guide

## Backend Configuration

The backend server runs on **port 9003** by default.

### Environment Variables

You can override the default configuration using environment variables:

```bash
# Backend server configuration
VITE_BACKEND_PORT=9003    # Backend port (default: 9003)
VITE_BACKEND_HOST=localhost  # Backend host (default: localhost)
VITE_BACKEND_PROTOCOL=http   # Backend protocol (default: http)
```

### Default URLs

- **Backend API**: http://localhost:9003
- **Frontend Dev Server**: http://localhost:5173
- **WebSocket**: ws://localhost:9003

## Frontend Configuration

The frontend automatically detects and uses the backend configuration from:

1. **Environment variables** (if set)
2. **Default values** (if no environment variables)

### Configuration File

The main configuration is centralized in `src/config/api.js`:

```javascript
export const API_CONFIG = {
  BACKEND_PORT: 9003,
  BACKEND_HOST: 'localhost',
  BACKEND_PROTOCOL: 'http',
  // ... other settings
};
```

## Quick Setup

1. **Start the backend**:
   ```bash
   cd /path/to/backend
   python main.py
   ```

2. **Start the frontend**:
   ```bash
   cd trading-dashboard
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9003

## Troubleshooting

### Port Already in Use

If port 9003 is already in use, you can:

1. **Change the port** using environment variables:
   ```bash
   export PORT=9004
   python main.py
   ```

2. **Or modify the default** in `main.py`:
   ```python
   port = int(os.getenv("PORT", 9004))
   ```

### CORS Issues

If you encounter CORS errors, ensure the backend is running and accessible at the configured URL.

### WebSocket Connection Issues

Make sure the WebSocket URL matches your backend configuration:
- Default: `ws://localhost:9003/sim/stream/{session_id}`

### 📁 Configuration Files

#### 1. **Frontend Configuration** (`trading-dashboard/src/config/api.js`)
- **Purpose**: Centralized API configuration for the React frontend
- **Contains**: Backend URL, WebSocket URL, API endpoints, timeouts, cache settings
- **Usage**: Imported by all API services

#### 2. **Backend Configuration** (`main.py`)
- **Purpose**: FastAPI server configuration
- **Contains**: Server host, port, reload settings
- **Usage**: Controls the backend server startup

#### 3. **Environment Variables** (`env.example`)
- **Purpose**: Environment-specific overrides
- **Contains**: Development/production settings
- **Usage**: Override default configuration

### 🔄 How Configuration Works

```javascript
// 1. Default configuration
export const API_CONFIG = {
  BACKEND_PORT: 9003,
  BACKEND_HOST: 'localhost',
  // ...
};

// 2. Environment overrides
export const getApiConfig = () => {
  const config = { ...API_CONFIG };
  
  if (import.meta.env.VITE_BACKEND_PORT) {
    config.BACKEND_PORT = parseInt(import.meta.env.VITE_BACKEND_PORT);
  }
  
  return config;
};

// 3. URL generation
export const getBackendUrl = (path = '') => {
  const { BACKEND_PROTOCOL, BACKEND_HOST, BACKEND_PORT } = API_CONFIG;
  return `${BACKEND_PROTOCOL}://${BACKEND_HOST}:${BACKEND_PORT}${path}`;
};
```

### 🚀 Usage Examples

#### Change Port to 8000
```javascript
// In trading-dashboard/src/config/api.js
export const API_CONFIG = {
  BACKEND_PORT: 8000,  // Changed from 9003
  // ... rest unchanged
};
```

#### Use Environment Variable
```bash
# In .env file
VITE_BACKEND_PORT=8000
```

#### Change Backend Server Port
```python
# In main.py
SERVER_CONFIG = {
    "port": 8000,  # Changed from 9003
    # ... rest unchanged
}
```

### 📋 Configuration Hierarchy

1. **Environment Variables** (highest priority)
   - `VITE_BACKEND_PORT`
   - `VITE_BACKEND_HOST`
   - `VITE_BACKEND_PROTOCOL`

2. **Frontend Config** (`api.js`)
   - Default values
   - Fallback configuration

3. **Backend Config** (`main.py`)
   - Server-specific settings
   - Can be overridden by environment variables

### 🔧 Available Settings

#### Frontend (`api.js`)
```javascript
export const API_CONFIG = {
  // Server settings
  BACKEND_PORT: 9003,
  BACKEND_HOST: 'localhost',
  BACKEND_PROTOCOL: 'http',
  WS_PROTOCOL: 'ws',
  
  // API paths
  SIM_BASE_PATH: '/sim',
  CHART_BASE_PATH: '/chart_data',
  
  // Timeouts
  REQUEST_TIMEOUT: 10000,
  WS_RECONNECT_DELAY: 3000,
  
  // Cache
  CACHE_DURATION: 30000,
  MAX_CACHE_SIZE: 100,
};
```

#### Backend (`main.py`)
```python
SERVER_CONFIG = {
    "host": "0.0.0.0",
    "port": 9003,
    "reload": True,
    "log_level": "info"
}
```

### 🌍 Environment Variables

Create a `.env` file in the `trading-dashboard` directory:

```bash
# Backend Configuration
VITE_BACKEND_PORT=9003
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PROTOCOL=http

# Development
VITE_DEV_MODE=true
VITE_ENABLE_LOGGING=true
```

### 🔍 Verification

After changing the port:

1. **Restart the backend server**:
   ```bash
   cd /path/to/MoMoney
   python main.py
   ```

2. **Restart the frontend development server**:
   ```bash
   cd trading-dashboard
   npm run dev
   ```

3. **Check the console** for connection messages:
   ```
   🚀 Starting MoMoney backend server on 0.0.0.0:9003
   📊 API Documentation: http://0.0.0.0:9003/docs
   ```

### 🐛 Troubleshooting

#### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :9003

# Kill the process
taskkill /PID <process_id> /F
```

#### CORS Issues
Make sure the backend CORS settings allow your frontend origin:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### WebSocket Connection Issues
Check that the WebSocket URL is correct:
```javascript
// Should match your backend port
const wsUrl = `ws://localhost:9003/sim/stream/${sessionId}`;
```

### 📝 Best Practices

1. **Use Environment Variables** for different environments (dev/staging/prod)
2. **Keep Default Values** in the config file for development
3. **Document Changes** when modifying configuration
4. **Test Both Frontend and Backend** after port changes
5. **Use Consistent Ports** across team members

### 🔗 Related Files

- `trading-dashboard/src/config/api.js` - Main configuration
- `