import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'
import { STLLoader } from 'three-stdlib/loaders/STLLoader'
import { useLoader } from '@react-three/fiber'

const STLModel = ({ url }) => {
  const geometry = useLoader(STLLoader, url)

  return (
    <mesh geometry={geometry} scale={0.5}>
      <meshStandardMaterial color="#0077ff" />
    </mesh>
  )
}

const STLViewer = ({ url }) => {
  return (
    <Canvas style={{ height: '500px', width: '100%' }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Suspense fallback={null}>
        <Stage>
          <STLModel url={url} />
        </Stage>
        <OrbitControls />
      </Suspense>
    </Canvas>
  )
}

export default STLViewer