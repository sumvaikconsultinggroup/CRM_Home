/**
 * State Machine Configurations
 * Defines valid states and transitions for all entities
 */

// Lead Pipeline States
export const LEAD_STAGES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  PROPOSAL: 'proposal',
  NEGOTIATION: 'negotiation',
  WON: 'won',
  LOST: 'lost'
}

export const LEAD_TRANSITIONS = {
  [LEAD_STAGES.NEW]: [LEAD_STAGES.CONTACTED, LEAD_STAGES.LOST],
  [LEAD_STAGES.CONTACTED]: [LEAD_STAGES.QUALIFIED, LEAD_STAGES.LOST],
  [LEAD_STAGES.QUALIFIED]: [LEAD_STAGES.PROPOSAL, LEAD_STAGES.LOST],
  [LEAD_STAGES.PROPOSAL]: [LEAD_STAGES.NEGOTIATION, LEAD_STAGES.WON, LEAD_STAGES.LOST],
  [LEAD_STAGES.NEGOTIATION]: [LEAD_STAGES.WON, LEAD_STAGES.LOST],
  [LEAD_STAGES.WON]: [],
  [LEAD_STAGES.LOST]: [LEAD_STAGES.NEW] // Can re-open
}

// Project Status States
export const PROJECT_STAGES = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived'
}

export const PROJECT_TRANSITIONS = {
  [PROJECT_STAGES.PLANNING]: [PROJECT_STAGES.IN_PROGRESS, PROJECT_STAGES.ON_HOLD, PROJECT_STAGES.CANCELLED],
  [PROJECT_STAGES.IN_PROGRESS]: [PROJECT_STAGES.ON_HOLD, PROJECT_STAGES.REVIEW, PROJECT_STAGES.CANCELLED],
  [PROJECT_STAGES.ON_HOLD]: [PROJECT_STAGES.IN_PROGRESS, PROJECT_STAGES.CANCELLED],
  [PROJECT_STAGES.REVIEW]: [PROJECT_STAGES.IN_PROGRESS, PROJECT_STAGES.COMPLETED],
  [PROJECT_STAGES.COMPLETED]: [PROJECT_STAGES.ARCHIVED],
  [PROJECT_STAGES.CANCELLED]: [PROJECT_STAGES.PLANNING], // Can re-open
  [PROJECT_STAGES.ARCHIVED]: []
}

// Task Status States
export const TASK_STAGES = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

export const TASK_TRANSITIONS = {
  [TASK_STAGES.BACKLOG]: [TASK_STAGES.TODO, TASK_STAGES.CANCELLED],
  [TASK_STAGES.TODO]: [TASK_STAGES.IN_PROGRESS, TASK_STAGES.BACKLOG, TASK_STAGES.CANCELLED],
  [TASK_STAGES.IN_PROGRESS]: [TASK_STAGES.REVIEW, TASK_STAGES.TODO, TASK_STAGES.CANCELLED],
  [TASK_STAGES.REVIEW]: [TASK_STAGES.COMPLETED, TASK_STAGES.IN_PROGRESS],
  [TASK_STAGES.COMPLETED]: [TASK_STAGES.TODO], // Can re-open
  [TASK_STAGES.CANCELLED]: [TASK_STAGES.TODO]
}

// Invoice Status States
export const INVOICE_STAGES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
}

export const INVOICE_TRANSITIONS = {
  [INVOICE_STAGES.DRAFT]: [INVOICE_STAGES.SENT, INVOICE_STAGES.CANCELLED],
  [INVOICE_STAGES.SENT]: [INVOICE_STAGES.PARTIAL, INVOICE_STAGES.PAID, INVOICE_STAGES.OVERDUE, INVOICE_STAGES.CANCELLED],
  [INVOICE_STAGES.PARTIAL]: [INVOICE_STAGES.PAID, INVOICE_STAGES.OVERDUE],
  [INVOICE_STAGES.PAID]: [],
  [INVOICE_STAGES.OVERDUE]: [INVOICE_STAGES.PARTIAL, INVOICE_STAGES.PAID],
  [INVOICE_STAGES.CANCELLED]: [INVOICE_STAGES.DRAFT]
}

// Quote Status States
export const QUOTE_STAGES = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted' // Converted to invoice
}

export const QUOTE_TRANSITIONS = {
  [QUOTE_STAGES.DRAFT]: [QUOTE_STAGES.SENT],
  [QUOTE_STAGES.SENT]: [QUOTE_STAGES.APPROVED, QUOTE_STAGES.REJECTED, QUOTE_STAGES.EXPIRED],
  [QUOTE_STAGES.APPROVED]: [QUOTE_STAGES.CONVERTED],
  [QUOTE_STAGES.REJECTED]: [QUOTE_STAGES.DRAFT], // Can revise
  [QUOTE_STAGES.EXPIRED]: [QUOTE_STAGES.DRAFT],
  [QUOTE_STAGES.CONVERTED]: []
}

// Dispatch Status States
export const DISPATCH_STAGES = {
  PENDING: 'pending',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
}

export const DISPATCH_TRANSITIONS = {
  [DISPATCH_STAGES.PENDING]: [DISPATCH_STAGES.DISPATCHED, DISPATCH_STAGES.CANCELLED],
  [DISPATCH_STAGES.DISPATCHED]: [DISPATCH_STAGES.IN_TRANSIT, DISPATCH_STAGES.CANCELLED],
  [DISPATCH_STAGES.IN_TRANSIT]: [DISPATCH_STAGES.DELIVERED],
  [DISPATCH_STAGES.DELIVERED]: [],
  [DISPATCH_STAGES.CANCELLED]: [DISPATCH_STAGES.PENDING]
}

// Installation Status States
export const INSTALLATION_STAGES = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled'
}

export const INSTALLATION_TRANSITIONS = {
  [INSTALLATION_STAGES.SCHEDULED]: [INSTALLATION_STAGES.IN_PROGRESS, INSTALLATION_STAGES.ON_HOLD, INSTALLATION_STAGES.CANCELLED],
  [INSTALLATION_STAGES.IN_PROGRESS]: [INSTALLATION_STAGES.COMPLETED, INSTALLATION_STAGES.ON_HOLD],
  [INSTALLATION_STAGES.ON_HOLD]: [INSTALLATION_STAGES.IN_PROGRESS, INSTALLATION_STAGES.CANCELLED],
  [INSTALLATION_STAGES.COMPLETED]: [],
  [INSTALLATION_STAGES.CANCELLED]: [INSTALLATION_STAGES.SCHEDULED]
}

/**
 * Validate if a transition is allowed
 * @param {object} config - The transitions config (e.g., LEAD_TRANSITIONS)
 * @param {string} fromStage - Current stage
 * @param {string} toStage - Target stage
 * @returns {boolean}
 */
export function isValidTransition(config, fromStage, toStage) {
  if (!config[fromStage]) return false
  return config[fromStage].includes(toStage)
}

/**
 * Get allowed next stages
 * @param {object} config - The transitions config
 * @param {string} currentStage - Current stage
 * @returns {string[]}
 */
export function getAllowedTransitions(config, currentStage) {
  return config[currentStage] || []
}

/**
 * State machine validator factory
 */
export function createStateMachine(stages, transitions, entityType) {
  return {
    stages,
    transitions,
    entityType,
    
    isValid(stage) {
      return Object.values(stages).includes(stage)
    },
    
    canTransition(from, to) {
      return isValidTransition(transitions, from, to)
    },
    
    getNextStages(current) {
      return getAllowedTransitions(transitions, current)
    },
    
    validate(from, to) {
      if (!this.isValid(from)) {
        return { valid: false, error: `Invalid current stage: ${from}` }
      }
      if (!this.isValid(to)) {
        return { valid: false, error: `Invalid target stage: ${to}` }
      }
      if (!this.canTransition(from, to)) {
        return { 
          valid: false, 
          error: `Invalid transition for ${entityType}: ${from} → ${to}. Allowed: ${this.getNextStages(from).join(', ') || 'none'}` 
        }
      }
      return { valid: true }
    }
  }
}

// Pre-built state machines
export const leadStateMachine = createStateMachine(LEAD_STAGES, LEAD_TRANSITIONS, 'Lead')
export const projectStateMachine = createStateMachine(PROJECT_STAGES, PROJECT_TRANSITIONS, 'Project')
export const taskStateMachine = createStateMachine(TASK_STAGES, TASK_TRANSITIONS, 'Task')
export const invoiceStateMachine = createStateMachine(INVOICE_STAGES, INVOICE_TRANSITIONS, 'Invoice')
export const quoteStateMachine = createStateMachine(QUOTE_STAGES, QUOTE_TRANSITIONS, 'Quote')
export const dispatchStateMachine = createStateMachine(DISPATCH_STAGES, DISPATCH_TRANSITIONS, 'Dispatch')
export const installationStateMachine = createStateMachine(INSTALLATION_STAGES, INSTALLATION_TRANSITIONS, 'Installation')

export default {
  LEAD_STAGES,
  LEAD_TRANSITIONS,
  PROJECT_STAGES,
  PROJECT_TRANSITIONS,
  TASK_STAGES,
  TASK_TRANSITIONS,
  INVOICE_STAGES,
  INVOICE_TRANSITIONS,
  QUOTE_STAGES,
  QUOTE_TRANSITIONS,
  DISPATCH_STAGES,
  DISPATCH_TRANSITIONS,
  INSTALLATION_STAGES,
  INSTALLATION_TRANSITIONS,
  isValidTransition,
  getAllowedTransitions,
  createStateMachine,
  leadStateMachine,
  projectStateMachine,
  taskStateMachine,
  invoiceStateMachine,
  quoteStateMachine,
  dispatchStateMachine,
  installationStateMachine
}
