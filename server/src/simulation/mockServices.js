export const MOCK_SERVICES = {
  'Booking Service': {
    name: 'Booking Service',
    endpoints: ['/api/bookings/create', '/api/bookings/confirm', '/api/bookings/cancel'],
    normalLatencies: [45, 90, 120, 180],
    errorMessages: [
      'Database Connection Pool Exhausted during booking transaction',
      'Timeout waiting for lock on reservation table',
      'NullPointerException in BookingWorkflowManager.java:142',
    ],
  },
  'Search Service': {
    name: 'Search Service',
    endpoints: ['/api/hotels/search', '/api/flights/search', '/api/destinations/suggest'],
    normalLatencies: [25, 50, 75, 110],
    errorMessages: [
      'ElasticSearch Query Timeout after 3000ms',
      'Cache read error: Redis connection refused',
      'Out of Memory error in SearchIndexAggregator',
    ],
  },
  'Payment Service': {
    name: 'Payment Service',
    endpoints: ['/api/payment/charge', '/api/payment/refund', '/api/payment/authorize'],
    normalLatencies: [60, 110, 150, 220],
    errorMessages: [
      'Payment Gateway GatewayTimeout: 504 from Provider',
      'Transaction rollbacked due to deadlock in account_balances',
      'TLS handshake failure with Payment Processor',
    ],
  },
};
