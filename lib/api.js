const API_BASE = '/api'

class ApiClient {
  constructor() {
    this.token = null
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
  }

  setToken(token) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    }
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return this.token
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong')
    }

    return data
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setToken(data.token)
    return data
  }

  async register(businessName, email, password, phone, planId) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ businessName, email, password, phone, planId }),
    })
    this.setToken(data.token)
    return data
  }

  async getMe() {
    return this.request('/auth/me')
  }

  logout() {
    this.setToken(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('client')
    }
  }

  // Plans
  async getPlans() {
    return this.request('/plans')
  }

  // Admin
  async getAdminStats() {
    return this.request('/admin/stats')
  }

  async getAdminClients() {
    return this.request('/admin/clients')
  }

  async getAdminClient(clientId) {
    return this.request(`/admin/clients/${clientId}`)
  }

  async toggleClientStatus(clientId) {
    return this.request(`/admin/clients/${clientId}/toggle-status`, { method: 'POST' })
  }

  async updateClientSubscription(clientId, data) {
    return this.request(`/admin/clients/${clientId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateClientModules(clientId, moduleId, action) {
    return this.request(`/admin/clients/${clientId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ moduleId, action }),
    })
  }

  async getAdminModules() {
    return this.request('/admin/modules')
  }

  async updateModule(moduleId, data) {
    return this.request(`/admin/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Client
  async getClientStats() {
    return this.request('/client/stats')
  }

  async getClientModules() {
    return this.request('/client/modules')
  }

  // Leads
  async getLeads() {
    return this.request('/leads')
  }

  async createLead(data) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLead(leadId, data) {
    return this.request(`/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLead(leadId) {
    return this.request(`/leads/${leadId}`, { method: 'DELETE' })
  }

  // Projects
  async getProjects() {
    return this.request('/projects')
  }

  async createProject(data) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProject(projectId, data) {
    return this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, { method: 'DELETE' })
  }

  // Tasks
  async getTasks() {
    return this.request('/tasks')
  }

  async createTask(data) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(taskId, data) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, { method: 'DELETE' })
  }

  // Expenses
  async getExpenses() {
    return this.request('/expenses')
  }

  async createExpense(data) {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateExpense(expenseId, data) {
    return this.request(`/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteExpense(expenseId) {
    return this.request(`/expenses/${expenseId}`, { method: 'DELETE' })
  }

  // Users
  async getUsers() {
    return this.request('/users')
  }

  async createUser(data) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(userId, data) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, { method: 'DELETE' })
  }

  // Reports
  async getSalesReport() {
    return this.request('/reports/sales')
  }

  async getExpensesReport() {
    return this.request('/reports/expenses')
  }

  // Public modules
  async getPublicModules() {
    return this.request('/modules/public')
  }
}

export const api = new ApiClient()
