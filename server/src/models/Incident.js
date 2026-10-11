import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  service: {
    type: String,
    required: true,
    enum: ['Booking Service', 'Search Service', 'Payment Service'],
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH',
  },
  triggeringRule: {
    type: String,
    required: true,
  },
  triggeringEvidence: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  startTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['OPEN', 'INVESTIGATING', 'RESOLVED'],
    default: 'OPEN',
    index: true,
  },
  circuitState: {
    type: String,
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    default: 'CLOSED',
  },
  aiAnalysisStatus: {
    type: String,
    enum: ['NOT_REQUESTED', 'PENDING', 'COMPLETED', 'FALLBACK', 'FAILED'],
    default: 'NOT_REQUESTED',
  },
  aiAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  recoveryTime: {
    type: Date,
    default: null,
  },
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    event: String,
    details: mongoose.Schema.Types.Mixed,
  }],
}, { timestamps: true });

IncidentSchema.index({ service: 1, status: 1 });

export const Incident = mongoose.model('Incident', IncidentSchema);
