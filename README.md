# EPOS Web Visualizer

An interactive React web application for analyzing and visualizing decentralized optimization experiment results from the EPOS framework. 

This tool provides a dynamic dashboard replacing static image-based analysis, allowing researchers to explore network topologies, plan selections, and cost convergence in real-time.

![Preview](public/data/tree_preview.png) *(Preview of the visualizer)*

## Features

- **Interactive Tree Overlay**: Renders EPOS network topologies with a clickable D3.js overlay. Hover over or click any agent node to instantly view its selected plan, local cost, and complex cost.
- **Dynamic Configuration Selection**: Instantly swap between 24 distinct experimental configurations via dropdowns (Agents, Plans, alpha local weight, beta unfairness weight).
- **Time-Series Playback**: A timeline slider with Play/Pause controls and adjustable speeds allows you to scrub through the 40 iterations of the optimization process.
- **Key Changes Mode**: Filter the timeline to display *only* iterations where an agent changed its plan selection, skipping static converged states.
- **Cost Convergence Chart**: An interactive D3 line chart tracks the root node's complex cost over time, highlighting the current iteration in sync with the tree animation.
- **Color Modes**: Toggle tree node colors between Complex Cost and Local Cost variants on the fly.

## Architecture & Tech Stack

- **Frontend Framework**: React 18 powered by Vite.
- **Visualization engine**: D3.js (`d3-hierarchy`, `d3-shape`, `d3-scale`) handles the computation of tree node positions and rendering of the responsive global cost chart.
- **Styling**: Bespoke Vanilla CSS modules implementing a responsive dark-mode glassmorphism design system. No external CSS frameworks are required.
- **Data Ingestion**: A Python script (`scripts/preprocess.py`) parses raw EPOS experiment outputs (CSV files and images) and produces a unified `experiments.json` for the web app to consume.

---

## Setup & Installation

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **npm** (Node package manager)
- **Python 3.8+** (for data preprocessing only)

### 2. Install Web Dependencies
Clone the repository and install the React dependencies:
```bash
cd EPOS_Web_Visualizer
npm install
```

---

## Data Preprocessing Pipeline

If you add new EPOS experiment data to the `Data/` folder, or if this is your first time setting up the project, you must generate the `experiments.json` file. 

The Python script parses the EPOS `used_conf.txt` files and the separated CSV/PNG outputs in the `radial_visualisation_new` directories. It also uses OCR (via Tesseract) to read the global cost from the PNG image titles.

### 1. Install Python Dependencies
```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install Pillow pytesseract
```
*Note: You must also have Tesseract installed on your system (`brew install tesseract` on macOS).*

### 2. Run the Preprocessor
```bash
# From the root EPOS_Web_Visualizer directory
scripts/.venv/bin/python scripts/preprocess.py
```
This will process all folders in `Data/` and output a combined dataset to `public/data/experiments.json`.

---

## Running the Application

To start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the dashboard.

## Building for Production

To create an optimized production build:
```bash
npm run build
```
The compiled static assets will be output to the `dist/` directory, ready to be hosted on any static web server (Netlify, Vercel, GitHub Pages, etc.). To preview the build locally:
```bash
npm run preview
```

## Data Directory Structure

The visualizer expects your `/Data` folder to have the following structure for each experiment:

```
Data/
├── 10_agents_5_plans_0.0_0.0/
│   ├── used_conf.txt
│   └── radial_visualisation_new/
│       ├── table_iter_000.csv
│       ├── tree_complex_cost_iter_000.png
│       ├── tree_local_cost_iter_000.png
│       └── ...
└── ...
```
