import { Log } from '../models/Log.js';
import { Incident } from '../models/Incident.js';

export class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY || null;
    this.provider = process.env.AI_PROVIDER || 'gemini';
    this.model = process.env.AI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Analyse an incident and produce structured contextual debugging report
   * @param {string} incidentId 
   * @returns {Promise<Object>}
   */
  async analyseIncident(incidentId) {
    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      throw new Error(`Incident with ID ${incidentId} not found`);
    }

    // Fetch related logs (up to 15 logs)
    const logs = await Log.find({
      $or: [
        { incidentId },
        { service: incident.service, timestamp: { $gte: new Date(incident.startTime.getTime() - 60000) } },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(15);

    const context = {
      incidentId: incident.incidentId,
      service: incident.service,
      title: incident.title,
      severity: incident.severity,
      triggeringRule: incident.triggeringRule,
      triggeringEvidence: incident.triggeringEvidence,
      circuitState: incident.circuitState,
      startTime: incident.startTime,
      logs: logs.map(l => ({
        timestamp: l.timestamp,
        severity: l.severity,
        httpStatus: l.httpStatus,
        latency: `${l.latency}ms`,
        message: l.message,
        errorCategory: l.errorCategory,
      })),
    };

    if (!process.env.AI_API_KEY || process.env.AI_API_KEY.trim() === '') {
      console.log(`[AI Service] AI_API_KEY is not configured. Generating transparent rule-based fallback diagnosis.`);
      const fallback = this.generateRuleBasedFallback(incident, context);
      incident.aiAnalysisStatus = 'FALLBACK';
      incident.aiAnalysis = fallback;
      incident.timeline.push({
        timestamp: new Date(),
        event: 'AI_ANALYSIS_FALLBACK',
        details: { reason: 'AI_API_KEY not configured in environment' },
      });
      await incident.save();
      return fallback;
    }

    try {
      const prompt = this.buildPrompt(context);
      const aiResponse = await this.callLLMProvider(prompt);
      const parsed = this.parseAndValidateResponse(aiResponse);
      
      // Update Incident record with AI analysis results
      incident.aiAnalysisStatus = 'COMPLETED';
      incident.aiAnalysis = parsed;
      incident.timeline.push({
        timestamp: new Date(),
        event: 'AI_ANALYSIS_COMPLETED',
        details: { provider: this.provider, model: this.model, confidence: parsed.confidence },
      });
      await incident.save();

      return parsed;
    } catch (err) {
      console.error(`[AI Service] LLM API call failed (${err.message}). Falling back to rule-based analysis.`);
      const fallback = this.generateRuleBasedFallback(incident, context, err.message);
      
      incident.aiAnalysisStatus = 'FALLBACK';
      incident.aiAnalysis = fallback;
      incident.timeline.push({
        timestamp: new Date(),
        event: 'AI_ANALYSIS_FALLBACK',
        details: { reason: err.message },
      });
      await incident.save();

      return fallback;
    }
  }

  buildPrompt(context) {
    return `You are a software reliability and debugging assistant for microservice architectures.
Analyse the supplied incident evidence carefully.

INCIDENT CONTEXT:
${JSON.stringify(context, null, 2)}

INSTRUCTIONS:
1. Return ONLY a valid, raw JSON object matching the JSON schema below.
2. Do not invent facts or claim to have inspected source code not included in the context.
3. Distinguish observed evidence from hypotheses.
4. If evidence is insufficient, state that clearly.
5. Do not include markdown code block backticks (\`\`\`json) or extra conversational text around the JSON object.

REQUIRED JSON RESPONSE SCHEMA:
{
  "incidentSummary": "String concise summary of what occurred",
  "observedFacts": ["Fact 1", "Fact 2"],
  "probableCauses": [
    { "hypothesis": "Cause description", "confidence": "HIGH | MEDIUM | LOW" }
  ],
  "evidence": ["Evidence 1", "Evidence 2"],
  "recommendedDebuggingSteps": ["Step 1", "Step 2"],
  "suggestedRemediation": ["Action 1", "Action 2"],
  "additionalInfoRequired": ["Info 1"],
  "confidence": {
    "level": "HIGH | MEDIUM | LOW",
    "explanation": "Why this level was assigned",
    "limitations": "Limitations of this diagnosis based on available data"
  },
  "isFallback": false
}`;
  }

  async callLLMProvider(prompt) {
    // Timeout controller (8 second max waiting time)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      let endpoint = '';
      let headers = { 'Content-Type': 'application/json' };
      let body = {};

      if (this.provider === 'gemini') {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${process.env.AI_API_KEY}`;
        body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        };
      } else {
        // OpenAI / compatible API provider
        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${process.env.AI_API_KEY}`;
        body = {
          model: this.model || 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`LLM API returned HTTP ${res.status}: ${errText.substring(0, 200)}`);
      }

      const json = await res.json();
      let textContent = '';

      if (this.provider === 'gemini') {
        textContent = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        textContent = json.choices?.[0]?.message?.content || '';
      }

      return textContent;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  parseAndValidateResponse(rawText) {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const data = JSON.parse(cleanText);

    return {
      incidentSummary: data.incidentSummary || 'Incident analysis generated.',
      observedFacts: Array.isArray(data.observedFacts) ? data.observedFacts : [],
      probableCauses: Array.isArray(data.probableCauses) ? data.probableCauses : [],
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
      recommendedDebuggingSteps: Array.isArray(data.recommendedDebuggingSteps) ? data.recommendedDebuggingSteps : [],
      suggestedRemediation: Array.isArray(data.suggestedRemediation) ? data.suggestedRemediation : [],
      additionalInfoRequired: Array.isArray(data.additionalInfoRequired) ? data.additionalInfoRequired : [],
      confidence: data.confidence || { level: 'MEDIUM', explanation: 'LLM generated analysis.', limitations: 'Based solely on metric logs.' },
      isFallback: false,
    };
  }

  /**
   * Transparent Rule-Based Fallback Engine
   */
  generateRuleBasedFallback(incident, context, reasonMsg = null) {
    const service = incident.service;
    const rule = incident.triggeringRule;

    let summary = `[RULE-BASED FALLBACK DIAGNOSIS] Incident detected on ${service} due to rule breach: ${rule}.`;
    let causes = [];
    let steps = [];
    let remediations = [];

    if (rule === 'HTTP_500_SPIKE') {
      causes = [
        { hypothesis: 'Database connection pool exhaustion or unhandled internal exception', confidence: 'HIGH' },
        { hypothesis: 'Downstream microservice dependency timeout', confidence: 'MEDIUM' },
      ];
      steps = [
        `Inspect recent HTTP 500 stack traces for ${service}.`,
        `Check database connection pool metrics and active queries.`,
        `Verify memory utilization and garbage collection pause times.`,
      ];
      remediations = [
        `Restart failing service instances or increase connection pool size.`,
        `Trigger Circuit Breaker manual reset once downstream service stabilizes.`,
      ];
    } else if (rule === 'HIGH_LATENCY') {
      causes = [
        { hypothesis: 'Slow database query execution or missing database index', confidence: 'HIGH' },
        { hypothesis: 'Network congestion or thread pool queueing', confidence: 'MEDIUM' },
      ];
      steps = [
        `Examine slow query logs for ${service}.`,
        `Check CPU and memory usage graphs for bottlenecks.`,
      ];
      remediations = [
        `Optimize query indexes or enable caching for hot data keys.`,
      ];
    } else {
      causes = [{ hypothesis: 'Increased error frequency across API endpoints', confidence: 'MEDIUM' }];
      steps = [`Inspect error logs filtered by severity ERROR and CRITICAL.`];
      remediations = [`Review recent software deployment or configuration changes.`];
    }

    return {
      incidentSummary: summary,
      observedFacts: [
        `Service affected: ${service}`,
        `Triggering rule: ${rule}`,
        `Current Circuit Breaker state: ${incident.circuitState}`,
        `Observed logs in window: ${context.logs.length}`,
      ],
      probableCauses: causes,
      evidence: [
        `Evidence breach data: ${JSON.stringify(incident.triggeringEvidence)}`,
        `Recent error logs tagged with HTTP ${context.logs.find(l => l.httpStatus >= 500)?.httpStatus || 500}`,
      ],
      recommendedDebuggingSteps: steps,
      suggestedRemediation: remediations,
      additionalInfoRequired: [
        'Full stack trace logs',
        'Infrastructure CPU/RAM metrics',
        'Database slow query log',
      ],
      confidence: {
        level: 'MEDIUM (Rule-Based Fallback)',
        explanation: reasonMsg ? `LLM API call failed (${reasonMsg}). Analysis generated by rule-based heuristic engine.` : 'AI_API_KEY not configured in environment. Analysis generated by rule-based heuristic engine.',
        limitations: 'Rule-based analysis cannot infer complex code logic beyond pre-programmed heuristic patterns.',
      },
      isFallback: true,
    };
  }
}

export const defaultAIService = new AIService();
