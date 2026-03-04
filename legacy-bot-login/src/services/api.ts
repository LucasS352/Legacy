import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// ============================================================
// Axios instance configured for the Legacy CRM API
// ============================================================
const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// ── Request interceptor: attach JWT token ──────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('legacy_token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── Response interceptor: handle 401 redirect ─────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('legacy_token');
            localStorage.removeItem('legacy_user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// ============================================================
// Auth API
// ============================================================
export const authApi = {
    login: (email: string, password: string) =>
        api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/login', { email, password }),

    me: () =>
        api.get<{ success: boolean; data: User }>('/auth/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
        api.put('/auth/change-password', { currentPassword, newPassword }),
};

// ============================================================
// Leads API
// ============================================================
export const leadsApi = {
    getAll: (params?: Record<string, unknown>) =>
        api.get<{ success: boolean; data: Lead[]; pagination: Pagination }>('/leads', { params }),

    getById: (id: number) =>
        api.get<{ success: boolean; data: Lead }>(`/leads/${id}`),

    create: (data: CreateLeadBody) =>
        api.post<{ success: boolean; data: Lead }>('/leads', data),

    update: (id: number, data: Partial<CreateLeadBody>) =>
        api.put<{ success: boolean; data: Lead }>(`/leads/${id}`, data),

    updateStage: (id: number, stage_id: number) =>
        api.patch(`/leads/${id}/stage`, { stage_id }),

    updateStatus: (id: number, status: string, verdict_notes?: string) =>
        api.patch(`/leads/${id}/status`, { status, verdict_notes }),

    toggleBot: (id: number) =>
        api.patch(`/leads/${id}/bot`),

    delete: (id: number) =>
        api.delete(`/leads/${id}`),

    getNotes: (id: number) =>
        api.get<{ success: boolean; data: Note[] }>(`/leads/${id}/notes`),

    createNote: (id: number, content: string) =>
        api.post<{ success: boolean; data: Note }>(`/leads/${id}/notes`, { content }),

    getDocuments: (id: number) =>
        api.get<{ success: boolean; data: Document[] }>(`/leads/${id}/documents`),

    createDocument: (id: number, data: Partial<Document>) =>
        api.post<{ success: boolean; data: Document }>(`/leads/${id}/documents`, data),

    getConversations: (id: number) =>
        api.get<{ success: boolean; data: Message[] }>(`/leads/${id}/conversations`),

    sendMessage: (id: number, content: string) =>
        api.post(`/leads/${id}/messages`, { content }),

    getFunnels: () =>
        api.get<{ success: boolean; data: Funnel[] }>('/leads/funnels'),

    getStages: () =>
        api.get<{ success: boolean; data: Stage[] }>('/leads/stages'),
};

// ============================================================
// Tasks API
// ============================================================
export const tasksApi = {
    getAll: (params?: Record<string, unknown>) =>
        api.get<{ success: boolean; data: Task[] }>('/tasks', { params }),

    create: (data: CreateTaskBody) =>
        api.post<{ success: boolean; data: Task }>('/tasks', data),

    update: (id: number, data: Partial<Task>) =>
        api.put<{ success: boolean; data: Task }>(`/tasks/${id}`, data),

    toggleStatus: (id: number) =>
        api.patch<{ success: boolean; data: { status: string } }>(`/tasks/${id}/toggle`),

    delete: (id: number) =>
        api.delete(`/tasks/${id}`),
};

// ============================================================
// Dashboard API
// ============================================================
export const dashboardApi = {
    getStats: () =>
        api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats'),

    getCharts: () =>
        api.get<{ success: boolean; data: DashboardCharts }>('/dashboard/charts'),
};

// ============================================================
// WhatsApp / Bot Setup API
// ============================================================
export const whatsappApi = {
    /** Trigger connection (returns QR code if not already connected) */
    connect: () =>
        api.post('/webhook/whatsapp/connect'),

    /** Get current connection status from Evolution API */
    getStatus: () =>
        api.get<{ success: boolean; data: { state: string; phone?: string; instance?: string } }>('/webhook/whatsapp/status'),

    /** Fetch the latest QR code base64 */
    getQR: () =>
        api.get('/webhook/whatsapp/qr'),

    /** Send a test WhatsApp message */
    sendTest: (phone: string, message: string) =>
        api.post('/webhook/whatsapp/test', { phone, message }),

    /** Disconnect / logout from WhatsApp and clear session */
    disconnect: () =>
        api.delete('/webhook/whatsapp/disconnect'),
};

// ============================================================
// TypeScript Types (mirrors backend types)
// ============================================================
export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'assessor';
    avatar_url?: string;
}

export interface Funnel {
    id: number;
    name: string;
    slug: string;
    color: string;
    description?: string;
}

export interface Stage {
    id: number;
    name: string;
    slug: string;
    display_order: number;
}

export interface Lead {
    id: number;
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    origin: 'whatsapp' | 'manual' | 'instagram' | 'site';
    funnel_id: number;
    stage_id: number;
    assigned_to?: number;
    status: 'active' | 'approved' | 'rejected' | 'archived';
    description?: string;
    bot_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields from API
    funnel_name?: string;
    funnel_slug?: string;
    funnel_color?: string;
    stage_name?: string;
    stage_slug?: string;
    stage_order?: number;
    assigned_user_name?: string;
}

export interface Task {
    id: number;
    lead_id: number;
    created_by: number;
    assigned_to?: number;
    title: string;
    description?: string;
    category: 'ligacao' | 'documento' | 'reuniao' | 'prazo' | 'outro';
    priority: 'alta' | 'media' | 'baixa';
    status: 'pendente' | 'em_andamento' | 'concluida';
    due_date?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    // Joined
    lead_name?: string;
    lead_phone?: string;
    funnel_name?: string;
    funnel_color?: string;
}

export interface Note {
    id: number;
    lead_id: number;
    author_type: 'user' | 'bot';
    author_user_id?: number;
    content: string;
    created_at: string;
    author_name?: string;
}

export interface Document {
    id: number;
    lead_id: number;
    name: string;
    file_type?: string;
    file_url?: string;
    status: 'pendente' | 'recebido' | 'aprovado' | 'rejeitado';
    notes?: string;
    created_at: string;
}

export interface Message {
    id: number;
    conversation_id: number;
    lead_id: number;
    content: string;
    direction: 'inbound' | 'outbound';
    sender: 'lead' | 'bot' | 'assessor';
    sent_at: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DashboardStats {
    totalLeads: number;
    activeLeads: number;
    approvedLeads: number;
    rejectedLeads: number;
    pendingTasks: number;
    todayTasks: number;
    overdueTasks: number;
    newLeadsToday: number;
    newLeadsWeek: number;
}

export interface DashboardCharts {
    leadsByFunnel: { funnel: string; count: number; color: string }[];
    leadsByStage: { stage: string; count: number }[];
    tasksByStatus: { status: string; count: number }[];
    leadsOverTime: { date: string; count: number }[];
}

export interface CreateLeadBody {
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    origin?: Lead['origin'];
    funnel_id: number;
    stage_id?: number;
    description?: string;
}

export interface CreateTaskBody {
    lead_id: number;
    title: string;
    description?: string;
    category?: Task['category'];
    priority?: Task['priority'];
    due_date?: string;
    assigned_to?: number;
}

export default api;
