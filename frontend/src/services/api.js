const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseUrl = API_URL.replace(/\/$/, '');
  }

  getToken() {
    return localStorage.getItem('shipsync_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('shipsync_token', token);
    } else {
      localStorage.removeItem('shipsync_token');
    }
  }

  getUser() {
    try {
      const data = localStorage.getItem('shipsync_user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem('shipsync_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('shipsync_user');
    }
  }

  logout() {
    localStorage.removeItem('shipsync_token');
    localStorage.removeItem('shipsync_refresh_token');
    localStorage.removeItem('shipsync_user');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && !endpoint.includes('/auth/login/')) {
        // Token expired or invalid
        this.logout();
        window.dispatchEvent(new CustomEvent('shipsync:auth_expired'));
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || data.detail || (typeof data === 'object' ? Object.values(data)[0] : 'Request failed'));
        error.data = data;
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  }

  // Authentication
  async login(username, password) {
    const data = await this.request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.tokens && data.tokens.access) {
      this.setToken(data.tokens.access);
      if (data.tokens.refresh) {
        localStorage.setItem('shipsync_refresh_token', data.tokens.refresh);
      }
    }
    if (data.user) {
      this.setUser(data.user);
    }
    return data;
  }

  async register(userData) {
    const data = await this.request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (data.tokens && data.tokens.access) {
      this.setToken(data.tokens.access);
      if (data.tokens.refresh) {
        localStorage.setItem('shipsync_refresh_token', data.tokens.refresh);
      }
    }
    if (data.user) {
      this.setUser(data.user);
    }
    return data;
  }

  async getProfile() {
    return this.request('/api/auth/profile/');
  }

  async seedDemo() {
    return this.request('/api/seed/', { method: 'POST' });
  }

  // Delivery Providers & Agents
  async getProviders() {
    return this.request('/api/providers/');
  }

  async getAgents(providerId) {
    const q = providerId ? `?provider_id=${providerId}` : '';
    return this.request(`/api/agents/${q}`);
  }

  // Shipments
  async getShipments(status) {
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/shipments/${q}`);
  }

  async getShipment(identifier) {
    return this.request(`/api/shipments/${identifier}/`);
  }

  async createShipment(shipmentData) {
    return this.request('/api/shipments/', {
      method: 'POST',
      body: JSON.stringify(shipmentData)
    });
  }

  async assignAgent(shipmentId, agentId) {
    return this.request(`/api/shipments/${shipmentId}/assign/`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId })
    });
  }

  async updateShipmentStatus(shipmentId, statusData) {
    return this.request(`/api/shipments/${shipmentId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
  }

  async updateLiveLocation(identifier, locationData) {
    return this.request(`/api/shipments/${identifier}/location/`, {
      method: 'POST',
      body: JSON.stringify(locationData)
    });
  }

  async getLiveTracking(identifier) {
    return this.request(`/api/shipments/${identifier}/location/`);
  }

  // Analytics
  async getAnalytics() {
    return this.request('/api/analytics/');
  }
}

export const api = new ApiService();

