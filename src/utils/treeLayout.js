/**
 * treeLayout.js
 * Computes pixel-space node positions for the EPOS agent tree,
 * matching the hierarchical layout used in the PNG images.
 *
 * EPOS builds a balanced binary tree where:
 *   - The root is the highest-indexed agent (numAgents - 1)
 *   - BFS position p corresponds to agent (numAgents - 1 - p)
 *   - Children of BFS position p are at positions p*k+1 … p*k+k
 *
 * We use d3.tree() to produce an orderly layout, then scale it
 * to fit the visible canvas area.
 */
import * as d3 from 'd3'

/**
 * Build a d3-compatible hierarchy from EPOS tree edges.
 * @param {number} numAgents
 * @param {number} numChildren - branching factor (usually 2)
 * @returns {Object} d3 hierarchy node
 */
function buildHierarchy(numAgents, numChildren = 2) {
  const root = numAgents - 1  // root agent ID

  function makeNode(agentId, pos) {
    const children = []
    for (let c = 1; c <= numChildren; c++) {
      const childPos = pos * numChildren + c
      if (childPos < numAgents) {
        const childAgentId = numAgents - 1 - childPos
        children.push(makeNode(childAgentId, childPos))
      }
    }
    return { id: agentId, children: children.length ? children : undefined }
  }

  return d3.hierarchy(makeNode(root, 0))
}

/**
 * Compute pixel positions for all nodes that match the PNG image layout.
 * Returns a Map from agentId -> { x, y }.
 *
 * @param {number} numAgents
 * @param {number} numChildren
 * @param {number} width  - container width in pixels
 * @param {number} height - container height in pixels
 * @returns {Map<number, {x: number, y: number, depth: number, isRoot: boolean, isLeaf: boolean}>}
 */
export function computeNodePositions(numAgents, numChildren, width, height) {
  const hier = buildHierarchy(numAgents, numChildren)

  // Use d3.tree for an orthogonal layout; we then rotate it 90°
  // so the root is at top-center, matching the PNG orientation
  const treeLayout = d3.tree()
    .size([width * 0.82, height * 0.70])  // leave margins
    .separation((a, b) => (a.parent === b.parent ? 1.2 : 2))

  const rooted = treeLayout(hier)
  const maxDepth = Math.max(...rooted.descendants().map(d => d.depth))

  const positions = new Map()
  rooted.descendants().forEach(node => {
    positions.set(node.data.id, {
      // Center the tree horizontally; push it down from top by ~8%
      x: node.x + width * 0.09,
      y: node.y + height * 0.07,
      depth: node.depth,
      isRoot: node.depth === 0,
      isLeaf: !node.children,
      maxDepth,
    })
  })

  return positions
}

/**
 * Compute radius for a node based on its depth (root = largest).
 */
export function nodeRadius(depth, maxDepth, numAgents) {
  const base = numAgents > 31 ? 14 : numAgents > 10 ? 18 : 22
  const minR = numAgents > 31 ? 8  : numAgents > 10 ? 10 : 14
  return Math.max(minR, base - depth * 2)
}
