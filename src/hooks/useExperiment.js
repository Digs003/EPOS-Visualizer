/**
 * useExperiment.js
 * Custom hook that selects the matching experiment from experiments.json
 * based on the user's dropdown selections.
 */
import { useMemo } from 'react'

/**
 * @param {Array} experiments - full list from experiments.json
 * @param {Object} selection - { numAgents, numPlans, alpha, beta }
 * @returns {Object|null} matching experiment or null
 */
export function useExperiment(experiments, selection) {
  return useMemo(() => {
    if (!experiments || !experiments.length) return null
    const { numAgents, numPlans, alpha, beta } = selection
    return experiments.find(exp =>
      exp.config.numAgents === numAgents &&
      exp.config.numPlans === numPlans &&
      Math.abs(exp.config.alpha - alpha) < 0.001 &&
      Math.abs(exp.config.beta  - beta)  < 0.001
    ) ?? null
  }, [experiments, selection])
}

/**
 * Extract sorted unique values for each dropdown from the experiments list.
 * @param {Array} experiments
 * @returns {{ agentCounts, planCounts, alphas, betas }}
 */
export function useDropdownOptions(experiments) {
  return useMemo(() => {
    if (!experiments?.length) return { agentCounts: [], planCounts: [], alphaBetas: [] }
    const agentCounts = [...new Set(experiments.map(e => e.config.numAgents))].sort((a, b) => a - b)
    const planCounts  = [...new Set(experiments.map(e => e.config.numPlans))].sort((a, b) => a - b)
    
    // Extract unique alpha/beta composite pairs
    const pairs = new Set(experiments.map(e => `${e.config.alpha},${e.config.beta}`))
    const alphaBetas = Array.from(pairs).map(p => {
      const [a, b] = p.split(',').map(Number)
      return { alpha: a, beta: b }
    }).sort((p1, p2) => p1.alpha - p2.alpha || p1.beta - p2.beta)

    return { agentCounts, planCounts, alphaBetas }
  }, [experiments])
}
