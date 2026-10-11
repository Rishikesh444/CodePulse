import mongoose from 'mongoose';

const ThresholdSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    default: 'default_rules',
  },
  windowSeconds: {
    type: Number,
    default: 10,
  },
  errorSpikeCount: {
    type: Number,
    default: 5, // Rule 1: 5 HTTP 500 errors in rolling window
  },
  latencyThresholdMs: {
    type: Number,
    default: 1000, // Rule 2: >1000ms average latency
  },
  errorRatePercentage: {
    type: Number,
    default: 20, // Rule 3: >20% error rate
  },
  circuitBreakerFailureLimit: {
    type: Number,
    default: 5,
  },
  circuitBreakerCooldownMs: {
    type: Number,
    default: 10000, // 10 seconds cooldown
  },
}, { timestamps: true });

export const Threshold = mongoose.model('Threshold', ThresholdSchema);
