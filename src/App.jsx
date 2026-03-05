/**
 * App.jsx
 * Root component for the EPOS Web Visualizer.
 *
 * Manages global state:
 *   - Selected experiment parameters (agents, plans, α, β)
 *   - Current iteration index
 *   - Color mode (complex cost / local cost)
 *   - Iteration display mode (all / key changes only)
 *
 * Layout (top-to-bottom):
 *   ┌────────────────────────────────────────────────────┐
 *   │  ControlPanel (header)                             │
 *   ├───────────────────────┬────────────────────────────┤
 *   │  TreeViewer (main)    │  Info sidebar              │
 *   │  (PNG tree)           │  ┌──────────────────────┐  │
 *   │                       │  │ Experiment info &    │  │
 *   │                       │  │ Agent Plans Table    │  │
 *   │                       │  └──────────────────────┘  │
 *   ├───────────────────────┴────────────────────────────┤
 *   │  IterationControls (slider + play/pause)           │
 *   ├────────────────────────────────────────────────────┤
 *   │  GlobalCostChart (D3 line chart)                   │
 *   └────────────────────────────────────────────────────┘
 */
import { useState, useEffect, useCallback } from 'react'
import ControlPanel from './components/ControlPanel.jsx'
import TreeViewer from './components/TreeViewer.jsx'
import IterationControls from './components/IterationControls.jsx'
import GlobalCostChart from './components/GlobalCostChart.jsx'
import { useExperiment, useDropdownOptions } from './hooks/useExperiment.js'
import styles from './App.module.css'

export default function App() {
  const [experiments, setExperiments] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Selected experiment parameters
  const [selection, setSelection] = useState({
    numAgents: 10,
    numPlans: 5,
    alpha: 0.0,
    beta: 0.0,
  })

  const [iteration, setIteration] = useState(0)
  const [colorMode, setColorMode] = useState('complex')  // 'complex' | 'local'
  const [iterMode, setIterMode]   = useState('all')       // 'all' | 'key'

  // Load experiments.json on mount
  useEffect(() => {
    fetch('/data/experiments.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setExperiments(data.experiments)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load experiments.json:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const experiment = useExperiment(experiments, selection)
  const options = useDropdownOptions(experiments)

  // When dropdowns change, if no matching experiment exists, find the closest valid one
  useEffect(() => {
    if (!experiment && experiments?.length) {
      const subset = experiments.filter(e => 
        e.config.numAgents === selection.numAgents && 
        e.config.numPlans === selection.numPlans
      );
      
      let fallback = subset[0] || experiments[0];
      
      const matchAlpha = subset.find(e => Math.abs(e.config.alpha - selection.alpha) < 0.001);
      const matchBeta = subset.find(e => Math.abs(e.config.beta - selection.beta) < 0.001);
      
      if (matchAlpha) fallback = matchAlpha;
      else if (matchBeta) fallback = matchBeta;

      setSelection({
        numAgents: fallback.config.numAgents,
        numPlans: fallback.config.numPlans,
        alpha: fallback.config.alpha,
        beta: fallback.config.beta,
      });
    }
  }, [experiment, experiments, selection]);

  // When experiment changes, reset iteration
  useEffect(() => {
    setIteration(0)
  }, [experiment?.id])

  const handleIterChange = useCallback((valOrFn) => {
    setIteration(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn)
  }, [])

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} />

  // Derive global cost + experiment summary for sidebar
  const iterData = experiment?.iterations?.[iteration]
  const globalCost = iterData
    ? iterData.agents.reduce((max, a) => Math.max(max, a.complexCost), 0).toFixed(4)
    : '—'

  return (
    <div className={styles.app}>
      <ControlPanel
        selection={selection}
        onSelection={setSelection}
        colorMode={colorMode}
        onColorMode={setColorMode}
        iterMode={iterMode}
        onIterMode={setIterMode}
        options={options}
        experiment={experiment}
      />

      <main className={styles.main}>
        {/* Tree visualization */}
        <div className={styles.treeArea}>
          <TreeViewer
            experiment={experiment}
            iteration={iteration}
            colorMode={colorMode}
          />
        </div>

        {/* Info sidebar */}
        <aside className={`glass ${styles.sidebar}`}>
          <SidebarInfo 
            experiment={experiment} 
            globalCost={globalCost} 
            iteration={iteration} 
            colorMode={colorMode}
          />
        </aside>
      </main>

      {/* Bottom: iteration controls + cost chart */}
      <footer className={styles.footer}>
        <div className={styles.iterArea}>
          <IterationControls
            experiment={experiment}
            iteration={iteration}
            onIteration={handleIterChange}
            iterMode={iterMode}
          />
        </div>
        <div className={styles.chartArea}>
          <GlobalCostChart
            experiment={experiment}
            iteration={iteration}
            onIteration={handleIterChange}
          />
        </div>
      </footer>
    </div>
  )
}

/** Sidebar summary card + Agent Plans Table */
function SidebarInfo({ experiment, globalCost, iteration, colorMode }) {
  if (!experiment) return (
    <div className={styles.sidebarEmpty}>No experiment selected</div>
  )
  const { config, iterations } = experiment
  const gamma = (1 - config.alpha - config.beta).toFixed(2)
  
  const iterData = iterations[iteration] ?? iterations[0]
  const agents = iterData?.agents || []
  const costLabel = colorMode === 'complex' ? 'Complex' : 'Local'

  return (
    <div className={styles.sidebarContent}>
      <div className={styles.sidebarTitle}>Experiment</div>

      <div className={styles.infoGrid}>
        <InfoRow label="Agents"     value={config.numAgents} />
        <InfoRow label="Plans"      value={config.numPlans} />
        <InfoRow label="Iterations" value={config.numIterations} />
        <InfoRow label="Dataset"    value={config.dataset ?? '—'} small />
      </div>

      <div className={styles.sidebarDivider} />
      <div className={styles.sidebarTitle}>Weights</div>

      <div className={styles.weightBars}>
        <WeightBar label="α local"    value={config.alpha} color="#4fd1c5" />
        <WeightBar label="β unfair"   value={config.beta}  color="#7c5dfa" />
        <WeightBar label="γ global"   value={parseFloat(gamma)} color="#fbbf24" />
      </div>

      <div className={styles.sidebarDivider} />
      <div className={styles.sidebarTitle}>Current State</div>

      <div className={styles.infoGrid}>
        <InfoRow label="Iteration"   value={iteration} />
        <InfoRow label="Global Cost" value={globalCost} accent />
      </div>

      {/* Agent Plans Table */}
      <div className={styles.agentTableContainer}>
        <div className={styles.agentTableHeader}>
          <span>Agent</span>
          <span>Plan</span>
          <span style={{ textAlign: 'right' }}>{costLabel}</span>
        </div>
        <div className={styles.agentTableBody}>
          {agents.map(a => (
            <div key={a.id} className={styles.agentTableRow}>
              <span className={styles.agentId}>{a.id}</span>
              <span className={styles.agentPlan} title={`Plan ${a.plan}`}>
                Plan {a.plan}
              </span>
              <span className={styles.agentCost}>
                {(colorMode === 'complex' ? a.complexCost : a.localCost).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, accent, small }) {
  return (
    <>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${accent ? styles.infoAccent : ''} ${small ? styles.infoSmall : ''}`}>
        {value}
      </span>
    </>
  )
}

function WeightBar({ label, value, color }) {
  return (
    <div className={styles.weightRow}>
      <span className={styles.weightLabel}>{label}</span>
      <div className={styles.weightTrack}>
        <div className={styles.weightFill} style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className={styles.weightVal}>{value.toFixed(1)}</span>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className={styles.fullScreen}>
      <div className={styles.loadingSpinner} />
      <p>Loading experiment data…</p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className={styles.fullScreen}>
      <div className={styles.errorIcon}>⚠</div>
      <p>Failed to load data: {message}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        Make sure the dev server is running from the EPOS_Web_Visualizer directory.
      </p>
    </div>
  )
}
