export const EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    // Product events
    PRODUCT_UPDATED: 'product:updated',
    // Job events
    JOB_STARTED: 'job:started',
    JOB_COMPLETED: 'job:completed',
    JOB_FAILED: 'job:failed',
    // Alert events
    ALERT_TRIGGERED: 'alert:triggered'
} as const;
