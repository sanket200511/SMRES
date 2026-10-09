import {
  User,
  Technician,
  Ticket,
  DashboardStats,
  RecurringIssuePattern,
  PriorityScoreBreakdown,
  DuplicateCheckResult,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`
  : '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('smres_jwt_token');
}

export function setStoredToken(token: string) {
  localStorage.setItem('smres_jwt_token', token);
}

export function clearStoredToken() {
  localStorage.removeItem('smres_jwt_token');
  localStorage.removeItem('smres_jwt_user');
}

function getHeaders(currentUser?: User) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (currentUser) {
    headers['x-user-role'] = currentUser.role;
    headers['x-user-id'] = currentUser.id;
    headers['x-user-name'] = currentUser.name;
    headers['X-Demo-User-ID'] = currentUser.id;
  } else {
    headers['x-user-role'] = 'admin';
    headers['x-user-id'] = 'admin-1';
    headers['x-user-name'] = 'Marcus Vance';
    headers['X-Demo-User-ID'] = 'admin-1';
  }
  return headers;
}

export const api = {
  async register(payload: {
    email: string;
    password: string;
    name?: string;
    role?: string;
    department?: string;
  }): Promise<{ access_token: string; token_type: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setStoredToken(data.access_token);
    localStorage.setItem('smres_jwt_user', JSON.stringify(data.user));
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<{ access_token: string; token_type: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid email or password');
    }
    const data = await res.json();
    setStoredToken(data.access_token);
    localStorage.setItem('smres_jwt_user', JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load user profile');
    return res.json();
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  },

  async getTechnicians(): Promise<Technician[]> {
    const res = await fetch(`${API_BASE}/technicians`);
    if (!res.ok) throw new Error('Failed to load technicians');
    return res.json();
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to load dashboard statistics');
    return res.json();
  },

  async triggerSlaCheckNow(): Promise<{ status: string; newly_escalated_count: number; escalated_ticket_ids: string[] }> {
    const res = await fetch(`${API_BASE}/stats/sla-check-now`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run SLA check');
    return res.json();
  },

  async getRecurringIssues(): Promise<RecurringIssuePattern[]> {
    const res = await fetch(`${API_BASE}/recurring?min_occurrences=2`);
    if (!res.ok) throw new Error('Failed to load recurring issue patterns');
    return res.json();
  },

  async getTickets(
    filters: {
      category?: string;
      status?: string;
      priority?: string;
      is_escalated?: boolean;
      building?: string;
      search?: string;
    } = {},
    currentUser?: User
  ): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.is_escalated !== undefined) params.append('is_escalated', String(filters.is_escalated));
    if (filters.building) params.append('building', filters.building);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
      headers: getHeaders(currentUser),
    });
    if (!res.ok) throw new Error('Failed to load maintenance tickets');
    return res.json();
  },

  async getTicket(id: string): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}`);
    if (!res.ok) throw new Error('Failed to load ticket details');
    return res.json();
  },

  async previewPriority(payload: any): Promise<PriorityScoreBreakdown> {
    const res = await fetch(`${API_BASE}/tickets/preview-priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to calculate priority preview');
    return res.json();
  },

  async checkDuplicate(payload: any): Promise<DuplicateCheckResult> {
    const res = await fetch(`${API_BASE}/tickets/check-duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to check duplicate tickets');
    return res.json();
  },

  async createTicket(payload: any, currentUser?: User): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit maintenance request');
    }
    return res.json();
  },

  async updateTicketStatus(
    id: string,
    status: string,
    notes?: string,
    resolution_notes?: string,
    currentUser?: User
  ): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ status, notes, resolution_notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update ticket status');
    }
    return res.json();
  },

  async assignTechnician(id: string, technician_id: string, currentUser?: User): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/assign`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ technician_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assign technician');
    }
    return res.json();
  },

  async overridePriority(id: string, priority: string, reason: string, currentUser?: User): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/override-priority`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ priority, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to override priority');
    }
    return res.json();
  },

  async manualEscalate(id: string, reason: string, level: number = 1, currentUser?: User): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/escalate`, {
      method: 'POST',
      headers: getHeaders(currentUser),
      body: JSON.stringify({ reason, level }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to trigger escalation');
    }
    return res.json();
  },

  async linkDuplicate(id: string, target_id: string, currentUser?: User): Promise<Ticket> {
    const res = await fetch(`${API_BASE}/tickets/${id}/link-duplicate/${target_id}`, {
      method: 'POST',
      headers: getHeaders(currentUser),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to link ticket');
    }
    return res.json();
  },
};
