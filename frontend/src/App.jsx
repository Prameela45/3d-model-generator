import { useState } from 'react';
import axios from 'axios';
import ModelViewer from './components/ModelViewer';
import ModelControls from './components/ModelControls';
import { saveAs } from 'file-saver';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import * as THREE from 'three';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('');
  const [userRole, setUserRole] = useState('');

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [parsedShapes, setParsedShapes] = useState([]);

  const [scale, setScale] = useState(1);
  const [rotationY, setRotationY] = useState(0);
  const [generatedStlUrl, setGeneratedStlUrl] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/login', { username, password });
      if (response.data.status === 'success') {
        setLoginStatus('Login successful!');
        setUserRole(response.data.role);
      } else {
        setLoginStatus('Login failed. Invalid credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginStatus('Login error. Backend unreachable or CORS issue.');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadStatus('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        const fileUrl = `http://localhost:5000/uploads/${res.data.filename}`;
        setUploadedFileUrl(fileUrl);
        setUploadStatus(`Uploaded: ${res.data.filename}`);
        setParseResult(res.data.parse_result || null);

        const shapes = (res.data.parse_result || []).filter(item =>
          item.type && (item.width || item.r) && (item.height || item.r)
        );
        setParsedShapes(shapes);

        setGeneratedStlUrl(null);
        setRotationY(0);
      } else {
        setUploadStatus('Upload failed. Try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Error during upload. Check backend or CORS policy.');
    }
  };

  const handleExportModel = () => {
    if (!parsedShapes.length) {
      alert('No parsed shapes to export.');
      return;
    }

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
        alert('STL generated successfully!');
      } else {
        alert('Failed to generate STL.');
      }
    } catch (error) {
      console.error('STL generation error:', error);
      alert('Error generating STL.');
    }
  };

  const handleDownloadStl = () => {
    if (generatedStlUrl) {
      saveAs(generatedStlUrl, 'generated_model.stl');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto', textAlign: 'center' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      <p>{loginStatus}</p>
      {userRole && <p><strong>Role:</strong> {userRole}</p>}

      <hr />

      <h3>Upload Blueprint (PNG, JPG, STL)</h3>
      <form onSubmit={handleFileUpload}>
        <input type="file" accept=".png,.jpg,.jpeg,.bmp,.gif,.stl" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit">Upload</button>
      </form>
      <p>{uploadStatus}</p>

      {uploadedFileUrl && uploadedFileUrl.endsWith('.stl') && (
        <>
          <h3>3D STL Model</h3>
          <ModelViewer fileUrl={uploadedFileUrl} />
          <ModelControls
            onExport={handleExportModel}
            onScaleIncrease={() => setScale(s => s + 0.1)}
            onRotate={() => setRotationY(r => r + Math.PI / 8)}
          />
        </>
      )}

      {uploadedFileUrl && !uploadedFileUrl.endsWith('.stl') && (
        <>
          <h3>Preview Image</h3>
          <img src={uploadedFileUrl} alt="Blueprint" style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }} />
          {parseResult && (
            <>
              <h4>Parsed Data</h4>
              <pre>{JSON.stringify(parseResult, null, 2)}</pre>
            </>
          )}
          {parsedShapes.length > 0 ? (
            <>
              <h3>3D Model Preview</h3>
              <ModelViewer shapes={parsedShapes} scale={scale} rotationY={rotationY} />
              <ModelControls
                onExport={handleExportModel}
                onScaleIncrease={() => setScale(s => s + 0.1)}
                onRotate={() => setRotationY(r => r + Math.PI / 8)}
              />
              {userRole === 'core' && (
                <button onClick={handleGenerateStl} style={{ marginTop: '10px' }}>
                  Generate STL
                </button>
              )}
            </>
          ) : (
            <p style={{ color: 'red' }}>No valid 3D shapes found in parsed result.</p>
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

export default App;