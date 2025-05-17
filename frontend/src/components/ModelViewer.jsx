import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Wall Component
const Wall = ({ x, y, width, height, index, showLabel }) => (
  <>
    <mesh position={[x + width / 2, y + height / 2, 37.5]} castShadow receiveShadow>
      <boxGeometry args={[width, height, 75]} />
      <meshStandardMaterial color="blue" />
    </mesh>
    {showLabel && (
      <Text
        position={[x + width / 2, y + height + 20, 75]}
        fontSize={14}
        color="white"
        outlineColor="black"
        outlineWidth={0.4}
        anchorX="center"
        anchorY="middle"
      >
        Wall {index}
      </Text>
    )}
  </>
);

// Door Component
const Door = ({ x, y, width, height, index, showLabel }) => (
  <>
    <mesh position={[x + width / 2, y + height / 2, 25]} castShadow receiveShadow>
      <boxGeometry args={[width, height, 50]} />
      <meshStandardMaterial color="green" />
    </mesh>
    {showLabel && (
      <Text
        position={[x + width / 2, y + height + 20, 50]}
        fontSize={14}
        color="white"
        outlineColor="black"
        outlineWidth={0.4}
        anchorX="center"
        anchorY="middle"
      >
        Door {index}
      </Text>
    )}
  </>
);

// Window Component
const Window = ({ x, y, width, height, index, showLabel }) => (
  <>
    <mesh position={[x + width / 2, y + height / 2, 20]} castShadow receiveShadow>
      <boxGeometry args={[width, height, 40]} />
      <meshStandardMaterial color="red" />
    </mesh>
    {showLabel && (
      <Text
        position={[x + width / 2, y + height + 20, 40]}
        fontSize={14}
        color="white"
        outlineColor="black"
        outlineWidth={0.4}
        anchorX="center"
        anchorY="middle"
      >
        Window {index}
      </Text>
    )}
  </>
);

// Circle Component
const Circle = ({ x, y, r, index, showLabel }) => (
  <>
    <mesh position={[x, y, 5]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, 10, 32]} />
      <meshStandardMaterial color="yellow" />
    </mesh>
    {showLabel && (
      <Text
        position={[x, y + r + 20, 10]}
        fontSize={14}
        color="white"
        outlineColor="black"
        outlineWidth={0.4}
        anchorX="center"
        anchorY="middle"
      >
        Circle {index}
      </Text>
    )}
  </>
);

// Shape Group with auto centering
const ShapeGroup = ({ shapes, showLabel, scale, rotate }) => {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      if (rotate) groupRef.current.rotation.y += 0.01;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = new THREE.Vector3();
    box.getCenter(center);
    groupRef.current.position.sub(center); // Center the group
  }, [shapes]);

  return (
    <group ref={groupRef}>
      {shapes.map((item, index) => {
        if (!item || typeof item !== 'object' || !item.type) return null;
        const props = {
          x: item.x ?? item.cx ?? 0,
          y: item.y ?? item.cy ?? 0,
          width: item.width ?? item.r ?? 10,
          height: item.height ?? item.r ?? 10,
          r: item.r ?? 10,
          index: index + 1,
          showLabel,
        };

        switch (item.type.toLowerCase()) {
          case 'wall': return <Wall key={index} {...props} />;
          case 'door': return <Door key={index} {...props} />;
          case 'window': return <Window key={index} {...props} />;
          case 'circle': return <Circle key={index} {...props} />;
          default: return null;
        }
      })}
    </group>
  );
};

// Screenshot button
const ScreenshotButton = ({ glRef }) => {
  const handleDownload = () => {
    const canvas = glRef.current?.domElement;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = '3d-blueprint-model.png';
    link.href = dataURL;
    link.click();
  };

  return (
    <button onClick={handleDownload} style={buttonStyle}>
      Download Model Image
    </button>
  );
};

// Main viewer component
const ModelViewer = ({ shapes = [] }) => {
  const [showLabels, setShowLabels] = useState(true);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(true);
  const glRef = useRef();

  if (!Array.isArray(shapes)) {
    return <p style={{ color: 'red' }}>Error: Invalid shapes data.</p>;
  }

  return (
    <div style={containerStyle}>
      <h3 style={{ marginBottom: '10px' }}>3D Model Preview</h3>
      <div style={canvasContainerStyle}>
        <Canvas
          camera={{ position: [0, 200, 500], fov: 50 }}
          shadows
          onCreated={({ gl }) => (glRef.current = gl)}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[200, 300, 200]} intensity={1} castShadow />
          <OrbitControls enablePan enableZoom enableRotate />

          {/* Ground Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
            <planeGeometry args={[2000, 2000]} />
            <meshStandardMaterial color="#dddddd" />
          </mesh>

          <ShapeGroup shapes={shapes} showLabel={showLabels} scale={scale} rotate={rotate} />
        </Canvas>
      </div>

      <div style={controlsStyle}>
        <button style={buttonStyle} onClick={() => setShowLabels(prev => !prev)}>
          {showLabels ? 'Hide Labels' : 'Show Labels'}
        </button>
        <button style={buttonStyle} onClick={() => setScale(prev => Math.min(prev + 0.1, 3))}>
          Increase Scale
        </button>
        <button style={buttonStyle} onClick={() => setScale(prev => Math.max(prev - 0.1, 0.2))}>
          Decrease Scale
        </button>
        <button style={buttonStyle} onClick={() => setRotate(prev => !prev)}>
          {rotate ? 'Stop Rotation' : 'Rotate'}
        </button>
        <ScreenshotButton glRef={glRef} />
      </div>
    </div>
  );
};

// Styling
const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
};

const canvasContainerStyle = {
  height: '600px',
  width: '100%',
  maxWidth: '1200px',
};

const controlsStyle = {
  marginTop: '20px',
  display: 'flex',
  gap: '15px',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const buttonStyle = {
  backgroundColor: '#007BFF',
  color: 'white',
  padding: '10px 20px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

export default ModelViewer;