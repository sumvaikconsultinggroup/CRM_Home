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

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
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

  // Plans & Modules
  async getPlans() {
    return this.request('/plans')
  }

  async getPublicModules() {
    return this.request('/modules-public')
  }

  // Admin APIs
  async getAdminStats() {
    return this.request('/admin/stats')
  }

  async getAdminClients() {
    return this.request('/admin/clients')
  }

  async getAdminClient(clientId) {
    return this.request(`/admin/clients/${clientId}`)
  }
  async resetClientPassword(clientId, password) {
    return this.request(`/admin/clients/${clientId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
  }

  async updateAdminClient(clientId, action, data = {}) {
    return this.request(`/admin/clients/${clientId}`, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    })
  }

  async getAdminModules() {
    return this.request('/admin/modules')
  }

  async updateAdminModule(moduleData) {
    return this.request('/admin/modules', {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    })
  }

  // Client APIs
  async getClientStats() {
    return this.request('/client/stats')
  }

  async getClientModules() {
    return this.request('/client/modules')
  }

  // Module Requests
  async getModuleRequests() {
    return this.request('/module-requests')
  }

  async createModuleRequest(moduleId, message) {
    return this.request('/module-requests', {
      method: 'POST',
      body: JSON.stringify({ moduleId, message }),
    })
  }

  async updateModuleRequest(requestId, action, adminMessage) {
    return this.request('/module-requests', {
      method: 'PUT',
      body: JSON.stringify({ requestId, action, adminMessage }),
    })
  }

  // Leads
  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/leads${query ? `?${query}` : ''}`)
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
  async getProjects(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/projects${query ? `?${query}` : ''}`)
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
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/tasks${query ? `?${query}` : ''}`)
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
  async getExpenses(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/expenses${query ? `?${query}` : ''}`)
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

  // Whitelabel
  async getWhitelabel() {
    return this.request('/whitelabel')
  }

  async updateWhitelabel(data) {
    return this.request('/whitelabel', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Lead Sources
  async getLeadSources() {
    return this.request('/lead-sources')
  }

  async createLeadSource(data) {
    return this.request('/lead-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteLeadSource(sourceId) {
    return this.request(`/lead-sources?id=${sourceId}`, {
      method: 'DELETE',
    })
  }

  // Lead Bulk Operations
  async bulkLeadAction(action, leadIds, data = {}) {
    return this.request('/leads/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, leadIds, data }),
    })
  }
}

export const api = new ApiClient()
