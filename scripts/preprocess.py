#!/usr/bin/env python3
"""
EPOS Data Preprocessor
======================
Extracts structured data from EPOS radial visualization CSVs and PNGs.
Outputs a single JSON file (experiments.json) consumed by the React web app.

Usage:
    cd EPOS_Web_Visualizer
    scripts/.venv/bin/python scripts/preprocess.py
"""

import csv
import json
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("WARNING: Missing PIL/pytesseract. Global Cost extraction will fail.")
    print("Install with: scripts/.venv/bin/pip install Pillow pytesseract")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "Data"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

def parse_config(config_path: Path) -> dict:
    """Parse a used_conf.txt file."""
    config = {}
    with open(config_path, "r") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("=") and not line.startswith("-"):
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()
                if key in ("numAgents", "numPlans", "numIterations", "numChildren"):
                    try: config[key] = int(value)
                    except ValueError: config[key] = value
                elif key in ("alpha", "beta", "convergenceTolerance"):
                    try: config[key] = float(value)
                    except ValueError: config[key] = value
                elif key == "global cost function":
                    config["globalCostFunction"] = value
                elif key == "local cost function":
                    config["localCostFunction"] = value
                else:
                    config[key] = value
    return config

def build_tree_edges(num_agents: int, num_children: int = 2) -> list:
    """Build the binary tree edge list for EPOS's balanced tree."""
    edges = []
    for pos in range(num_agents):
        agent_id = num_agents - 1 - pos
        for c in range(1, num_children + 1):
            child_pos = pos * num_children + c
            if child_pos < num_agents:
                child_agent_id = num_agents - 1 - child_pos
                edges.append([agent_id, child_agent_id])
    return edges

def extract_global_cost_from_image(image_path: Path) -> float | None:
    """Extract global cost from the top title of the PNG image using OCR."""
    try:
        img = Image.open(image_path)
        width, height = img.size
        # Crop just the very top 6% of the image containing the title
        title_crop = img.crop((0, 0, int(width * 0.72), int(height * 0.06)))
        title_text = pytesseract.image_to_string(title_crop, config='--psm 7')
        
        cost_match = re.search(r'[Gg]lobal\s*[Cc]ost[:\s]+(\d+\.?\d*)', title_text)
        if cost_match:
            return float(cost_match.group(1))
    except Exception as e:
        print(f"    WARNING: OCR failed for {image_path.name}: {e}")
    return None

def process_experiment(exp_dir: Path) -> dict | None:
    """Process a single experiment directory."""
    config_path = exp_dir / "used_conf.txt"
    viz_dir = exp_dir / "radial_visualisation_new"
    
    if not config_path.exists() or not viz_dir.exists():
        print(f"  Skipping {exp_dir.name}: missing config or radial_visualisation_new")
        return None
    
    config = parse_config(config_path)
    folder_name = exp_dir.name
    
    print(f"  Processing {folder_name} (α={config.get('alpha')}, β={config.get('beta')})")
    
    num_agents = config.get("numAgents", 10)
    edges = build_tree_edges(num_agents, config.get("numChildren", 2))
    
    iterations_data = []
    
    # Process all iterations (0 to 39)
    for i in range(config.get("numIterations", 40)):
        csv_file = viz_dir / f"table_iter_{i:03d}.csv"
        img_file = viz_dir / f"tree_complex_cost_iter_{i:03d}.png"
        
        if not csv_file.exists():
            continue
            
        agents = []
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                agents.append({
                    "id": int(row["Agent"]),
                    "plan": int(row["Plan"]),
                    "localCost": float(row["LocalCost"]),
                    "complexCost": float(row["ComplexCost"])
                })
        
        global_cost = None
        if img_file.exists():
            global_cost = extract_global_cost_from_image(img_file)
            
        iterations_data.append({
            "iteration": i,
            "globalCost": global_cost,
            "agents": agents
        })
    
    # Detect key iterations (where any agent's plan changed)
    key_iterations = [0]
    for i in range(1, len(iterations_data)):
        prev_plans = {a["id"]: a["plan"] for a in iterations_data[i-1]["agents"]}
        curr_plans = {a["id"]: a["plan"] for a in iterations_data[i]["agents"]}
        if prev_plans != curr_plans:
            key_iterations.append(iterations_data[i]["iteration"])
    if iterations_data and iterations_data[-1]["iteration"] not in key_iterations:
        key_iterations.append(iterations_data[-1]["iteration"])
    
    return {
        "id": folder_name,
        "config": config,
        "edges": edges,
        "iterations": iterations_data,
        "keyIterations": key_iterations,
    }

def main():
    print("=" * 60)
    print("EPOS Data Preprocessor (CSV + Title OCR)")
    print("=" * 60)
    
    exp_dirs = sorted([d for d in DATA_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")])
    print(f"Found {len(exp_dirs)} experiment directories\\n")
    
    experiments = []
    for exp_dir in exp_dirs:
        res = process_experiment(exp_dir)
        if res:
            experiments.append(res)
            
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outpath = OUTPUT_DIR / "experiments.json"
    
    with open(outpath, "w") as f:
        json.dump({"experiments": experiments}, f, separators=(',', ':'))
        
    print(f"\\nDone! Saved to {outpath} ({outpath.stat().st_size / (1024*1024):.1f} MB)")

if __name__ == "__main__":
    main()
