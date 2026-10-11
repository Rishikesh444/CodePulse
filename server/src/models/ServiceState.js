import mongoose from 'mongoose';

const ServiceStateSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    unique: true,
    enum: ['Booking Service', 'Search Service', 'Payment Service'],
  },
  health: {
    type: String,
    enum: ['HEALTHY', 'DEGRADED', 'ISOLATED'],
    default: 'HEALTHY',
  },
  circuitState: {
    type: String,
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    default: 'CLOSED',
  },
  consecutiveFailures: {
    type: Number,
    default: 0,
  },
  totalRequests: {
    type: Number,
    default: 0,
  },
  totalErrors: {
    type: Number,
    default: 0,
  },
  lastFailureTime: {
    type: Date,
    default: null,
  },
  lastIncidentTime: {
    type: Date,
    default: null,
  },
  lastStateChange: {
    type: Date,
    default: Date.now,
  },
  cooldownExpiry: {
    type: Date,
    default: null,
  },
  manualFailureMode: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const ServiceState = mongoose.model('ServiceState', ServiceStateSchema);
