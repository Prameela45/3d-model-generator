# 3D Model Generator

An AI-powered tool to convert 2D architectural blueprints into interactive 3D construction models, with STL, OBJ, and GLTF export functionality.

## Features

- Upload and parse 2D blueprint images
- AI-based recognition of walls, doors, and windows
- View 3D construction layouts with labeling
- Export 3D models to STL, OBJ, and GLTF
- Realistic visual representation with wall thickness and door/window placements
- Role-based login system (Admin & Core Users)

## Tech Stack

- *Frontend*: ReactJS, Three.js, @react-three/fiber, Tailwind CSS
- *Backend*: Python, Flask
- *AI/ML*: Image processing and blueprint parsing (custom model)
- *Exports*: trimesh, stl, pygltflib

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Prameela45/3d-model-generator.git
cd 3d-model-generator
