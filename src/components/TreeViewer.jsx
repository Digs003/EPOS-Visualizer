/**
 * TreeViewer.jsx
 * Displays the custom EPOS Python PNG networkx tree images without overlays.
 * Agent details are now displayed in a separate side-panel instead of tooltips.
 */
import { useRef } from 'react'
import styles from './TreeViewer.module.css'

/**
 * Resolve the correct PNG path for given experiment + iteration + color mode.
 * Images are served from /Data/<expId>/radial_visualisation_new/
 *
 * @param {string} expId     - experiment folder name
 * @param {number} iteration
 * @param {string} colorMode - 'complex' | 'local'
 */
function imagePath(expId, iteration, colorMode) {
  const type = colorMode === 'local' ? 'local_cost' : 'complex_cost'
  const iter = String(iteration).padStart(3, '0')
  return `/Data/${expId}/radial_visualisation_new/tree_${type}_iter_${iter}.png`
}

/**
 * @param {Object}   props.experiment - full experiment object from JSON
 * @param {number}   props.iteration
 * @param {string}   props.colorMode  - 'complex' | 'local'
 */
export default function TreeViewer({ experiment, iteration, colorMode }) {
  const containerRef = useRef(null)

  if (!experiment) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>⌀</div>
        <p>Select an experiment from the controls above.</p>
      </div>
    )
  }

  const { iterations } = experiment
  const iterData = iterations[iteration] ?? iterations[0]
  const src = imagePath(experiment.id, iterData.iteration, colorMode)

  return (
    <div className={styles.wrapper} ref={containerRef}>
      {/* The actual PNG — displayed at full container size */}
      <img
        src={src}
        alt={`Tree iteration ${iteration}`}
        className={styles.treeImage}
        draggable={false}
      />
    </div>
  )
}
