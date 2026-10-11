import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true,
    enum: ['Booking Service', 'Search Service', 'Payment Service'],
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
    default: 'INFO',
    index: true,
  },
  httpStatus: {
    type: Number,
    required: true,
  },
  latency: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  errorCategory: {
    type: String,
    default: null,
  },
  correlationId: {
    type: String,
    required: true,
  },
  incidentId: {
    type: String,
    default: null,
    index: true,
  }
}, { timestamps: true });

LogSchema.index({ service: 1, timestamp: -1 });
LogSchema.index({ timestamp: -1 });

export const Log = mongoose.model('Log', LogSchema);
