import React, { useState } from 'react';
import ModelViewer from './components/ModelViewer';
import ModelControls from './components/ModelControls';
import { saveAs } from 'file-saver';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import * as THREE from 'three';
import axios from 'axios';

function PreviewPage({ parsedShapes, parseResult, uploadedFileUrl, file, userRole }) {
  const [scale, setScale] = useState(1);
  const [rotationY, setRotationY] = useState(0);
  const [generatedStlUrl, setGeneratedStlUrl] = useState(null);

  const handleExportModel = () => {
    if (!parsedShapes.length) return alert('No parsed shapes.');

    const scene = new THREE.Scene();
    const depth = 5;

    parsedShapes.forEach((shape) => {
      let geometry;
      const width = shape.width || shape.r || 10;
      const height = shape.height || shape.r || 10;
      const x = shape.x ?? shape.cx ?? 0;
      const y = shape.y ?? shape.cy ?? 0;

      if (['rectangle', 'wall', 'door', 'window'].includes(shape.type)) {
        geometry = new THREE.BoxGeometry(width * scale, height * scale, depth);
      } else if (shape.type === 'circle') {
        geometry = new THREE.CylinderGeometry(shape.r * scale, shape.r * scale, depth, 32);
      }

      if (geometry) {
        const material = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x * scale, y * scale, depth / 2);
        mesh.rotation.y = rotationY;
        scene.add(mesh);
      }
    });

    const exporter = new STLExporter();
    const stlString = exporter.parse(scene);
    const blob = new Blob([stlString], { type: 'text/plain' });
    saveAs(blob, 'model.stl');
  };

  const handleGenerateStl = async () => {
    try {
      const res = await axios.post('http://localhost:5000/generate_stl', {
        filename: file?.name || '',
      });
      if (res.data.status === 'success') {
        setGeneratedStlUrl(res.data.url);
      } else {
        alert('Failed to generate STL.');
      }
    } catch {
      alert('Error generating STL.');
    }
  };

  const handleDownloadStl = () => {
    if (generatedStlUrl) saveAs(generatedStlUrl, 'generated_model.stl');
  };

  return (
    <div>
      <h2>3D Model Preview</h2>

      {uploadedFileUrl?.endsWith('.stl') ? (
        <ModelViewer fileUrl={uploadedFileUrl} />
      ) : (
        <>
          <img src={uploadedFileUrl} alt="Blueprint" style={{ maxWidth: '100%' }} />
          {parseResult && (
            <>
              <h4>Parsed Data</h4>
              <pre>{JSON.stringify(parseResult, null, 2)}</pre>
            </>
          )}
          {parsedShapes.length > 0 ? (
            <>
              <ModelViewer shapes={parsedShapes} scale={scale} rotationY={rotationY} />
              <ModelControls
                onExport={handleExportModel}
                onScaleIncrease={() => setScale(s => s + 0.1)}
                onRotate={() => setRotationY(r => r + Math.PI / 8)}
              />
              {userRole === 'core' && <button onClick={handleGenerateStl}>Generate STL</button>}
            </>
          ) : (
            <p style={{ color: 'red' }}>No valid shapes to preview.</p>
          )}
        </>
      )}

      {generatedStlUrl && (
        <>
          <h3>Generated STL Preview</h3>
          <ModelViewer fileUrl={generatedStlUrl} />
          <button onClick={handleDownloadStl}>Download STL</button>
        </>
      )}
    </div>
  );
}

export default PreviewPage;