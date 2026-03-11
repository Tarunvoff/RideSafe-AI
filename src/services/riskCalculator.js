/**
 * riskCalculator.js
 * Simulated AI risk scoring engine for Phase-1 prototype.
 * In production, this would call a backend ML model.
 */

import { MOCK_RISK_SCORE } from '../data/mockData';

// ── Risk Score Computation ─────────────────────────────────────────────────────

/**
 * Computes overall risk score from individual factor scores.
 * Weighted average: weather 30%, pollution 20%, disruption 25%, traffic 15%, demand 10%
 */
export function computeOverallRisk(factors) {
  const weights = { weather: 0.30, pollution: 0.20, disruption: 0.25, traffic: 0.15, demand: 0.10 };
  let total = 0;
  let totalWeight = 0;
  factors.forEach((f) => {
    const w = weights[f.id] ?? 0.1;
    total += f.score * w;
    totalWeight += w;
  });
  return Math.round(total / totalWeight);
}

/**
 * Returns a simulated risk assessment for the current worker profile.
 * Introduces minor random variation to simulate live data.
 */
export function getLiveRiskScore() {
  const variation = () => Math.floor(Math.random() * 10) - 5;
  const factors = MOCK_RISK_SCORE.factors.map((f) => ({
    ...f,
    score: Math.min(100, Math.max(0, f.score + variation())),
  }));
  const overall = computeOverallRisk(factors);
  return {
    ...MOCK_RISK_SCORE,
    overall,
    factors,
    timestamp: new Date().toISOString(),
  };
}

// ── Payout Calculator ──────────────────────────────────────────────────────────

/**
 * Calculates the insurance payout for a disruption event.
 * @param {Object} plan - Selected insurance plan
 * @param {Object} disruption - Disruption event details
 * @param {number} dailyEarnings - Worker's average daily earnings
 */
export function calculatePayout({ plan, disruption, dailyEarnings }) {
  if (!plan || !disruption) return 0;

  // Disruption impact factor (0–1)
  const impactFactor = disruption.probability / 100;

  // Estimated income loss
  const estimatedLoss = Math.round(dailyEarnings * impactFactor * disruption.durationHours / 8);

  // Payout capped at plan's max payout
  const rawPayout = Math.min(estimatedLoss * 0.92, plan.maxPayout / 7);

  return {
    estimatedLoss,
    rawPayout: Math.round(rawPayout),
    approvedPayout: Math.round(rawPayout * 0.94), // slight deductible
    processingTime: `< ${Math.floor(Math.random() * 2) + 1} minutes`,
  };
}

// ── Alert Severity Mapper ──────────────────────────────────────────────────────

export function getAlertPriority(alert) {
  if (alert.probability >= 85 && alert.severity === 'critical') return 'urgent';
  if (alert.probability >= 70) return 'high';
  if (alert.probability >= 50) return 'medium';
  return 'low';
}

// ── Risk Trend Analyzer ────────────────────────────────────────────────────────

/**
 * Returns week-over-week trend for a risk factor.
 * Uses mock data with random variation.
 */
export function getWeeklyTrend(factorId) {
  const trends = { weather: 'up', pollution: 'stable', disruption: 'up', traffic: 'down', demand: 'up' };
  return trends[factorId] ?? 'stable';
}

// ── Plan Recommendation ────────────────────────────────────────────────────────

/**
 * Recommends a plan based on worker's average earnings and risk score.
 */
export function recommendPlan(avgWeeklyEarnings, riskScore) {
  if (avgWeeklyEarnings >= 6000 || riskScore >= 70) return 'elite';
  if (avgWeeklyEarnings >= 3500 || riskScore >= 50) return 'pro';
  return 'basic';
}
