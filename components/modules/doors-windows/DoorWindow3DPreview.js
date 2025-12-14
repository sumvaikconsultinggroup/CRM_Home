'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Text, Box, RoundedBox, useHelper } from '@react-three/drei'
import * as THREE from 'three'

// Glass material for realistic window effect
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x88ccff,
  transparent: true,
  opacity: 0.3,
  roughness: 0,
  metalness: 0,
  transmission: 0.9,
  thickness: 0.5,
  envMapIntensity: 1,
})

// Frame materials based on color
const frameMaterials = {
  white: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3, metalness: 0.1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.2 }),
  grey: new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.3, metalness: 0.3 }),
  brown: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.5, metalness: 0.1 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.2, metalness: 0.7 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0xCD7F32, roughness: 0.3, metalness: 0.5 }),
}

// Window Component
function Window3D({ config, position = [0, 0, 0] }) {
  const groupRef = useRef()
  const {
    width = 1.2,
    height = 1.5,
    panels = 2,
    category = 'Sliding',
    frameColor = 'white',
    frameThickness = 0.05
  } = config || {}

  // Convert mm to meters (scale)
  const w = width / 1000
  const h = height / 1000
  const ft = frameThickness
  const panelWidth = (w - ft * (panels + 1)) / panels
  const frameMat = frameMaterials[frameColor] || frameMaterials.white

  // Animate subtle movement
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Outer Frame */}
      {/* Top */}
      <Box args={[w, ft, ft]} position={[0, h / 2 - ft / 2, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>
      {/* Bottom */}
      <Box args={[w, ft, ft]} position={[0, -h / 2 + ft / 2, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>
      {/* Left */}
      <Box args={[ft, h, ft]} position={[-w / 2 + ft / 2, 0, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>
      {/* Right */}
      <Box args={[ft, h, ft]} position={[w / 2 - ft / 2, 0, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>

      {/* Glass Panels */}
      {Array.from({ length: panels }).map((_, i) => {
        const panelX = -w / 2 + ft + panelWidth / 2 + i * (panelWidth + ft)
        return (
          <group key={i}>
            {/* Glass */}
            <Box 
              args={[panelWidth - 0.02, h - ft * 2 - 0.02, 0.01]} 
              position={[panelX, 0, 0]}
            >
              <meshPhysicalMaterial
                color={0x88ccff}
                transparent
                opacity={0.25}
                roughness={0}
                metalness={0}
                transmission={0.9}
              />
            </Box>
            {/* Panel Frame */}
            <Box args={[panelWidth, ft / 2, ft / 2]} position={[panelX, h / 2 - ft - ft / 4, ft / 4]}>
              <primitive object={frameMat} attach="material" />
            </Box>
            <Box args={[panelWidth, ft / 2, ft / 2]} position={[panelX, -h / 2 + ft + ft / 4, ft / 4]}>
              <primitive object={frameMat} attach="material" />
            </Box>
            {/* Divider frames between panels */}
            {i > 0 && (
              <Box args={[ft / 2, h - ft * 2, ft]} position={[panelX - panelWidth / 2 - ft / 4, 0, 0]}>
                <primitive object={frameMat} attach="material" />
              </Box>
            )}
          </group>
        )
      })}

      {/* Handle for sliding windows */}
      {category === 'Sliding' && (
        <Box args={[0.08, 0.02, 0.02]} position={[w / 4, 0, ft / 2 + 0.015]}>
          <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.2} />
        </Box>
      )}
    </group>
  )
}

// Door Component
function Door3D({ config, position = [0, 0, 0] }) {
  const groupRef = useRef()
  const {
    width = 900,
    height = 2100,
    panels = 1,
    category = 'French',
    frameColor = 'brown',
    frameThickness = 0.06
  } = config || {}

  const w = width / 1000
  const h = height / 1000
  const ft = frameThickness
  const panelWidth = (w - ft * (panels + 1)) / panels
  const frameMat = frameMaterials[frameColor] || frameMaterials.brown

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Door Frame */}
      {/* Top */}
      <Box args={[w + ft * 2, ft, ft * 2]} position={[0, h / 2 + ft / 2, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>
      {/* Left */}
      <Box args={[ft, h + ft, ft * 2]} position={[-w / 2 - ft / 2, 0, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>
      {/* Right */}
      <Box args={[ft, h + ft, ft * 2]} position={[w / 2 + ft / 2, 0, 0]}>
        <primitive object={frameMat} attach="material" />
      </Box>

      {/* Door Panels */}
      {Array.from({ length: panels }).map((_, i) => {
        const panelX = -w / 2 + ft / 2 + panelWidth / 2 + i * (panelWidth + ft)
        const hasGlass = category === 'French' || category === 'Sliding' || category === 'Bi-Fold'
        
        return (
          <group key={i}>
            {/* Door panel body */}
            <Box args={[panelWidth, h - 0.02, ft]} position={[panelX, 0, 0]}>
              <meshStandardMaterial 
                color={frameColor === 'brown' ? 0x654321 : frameMat.color} 
                roughness={0.6} 
                metalness={0.1} 
              />
            </Box>
            
            {/* Glass insert for French/Glass doors */}
            {hasGlass && (
              <Box 
                args={[panelWidth * 0.7, h * 0.5, 0.015]} 
                position={[panelX, h * 0.15, ft / 2 + 0.01]}
              >
                <meshPhysicalMaterial
                  color={0x88ccff}
                  transparent
                  opacity={0.2}
                  roughness={0}
                  metalness={0}
                  transmission={0.9}
                />
              </Box>
            )}

            {/* Handle */}
            <Box args={[0.015, 0.12, 0.025]} position={[
              i === 0 ? panelX + panelWidth / 2 - 0.05 : panelX - panelWidth / 2 + 0.05, 
              0, 
              ft / 2 + 0.02
            ]}>
              <meshStandardMaterial color={0xc0c0c0} metalness={0.9} roughness={0.1} />
            </Box>
          </group>
        )
      })}

      {/* Threshold */}
      <Box args={[w + ft, 0.02, ft * 3]} position={[0, -h / 2, 0]}>
        <meshStandardMaterial color={0x444444} roughness={0.5} metalness={0.3} />
      </Box>
    </group>
  )
}

// Scene setup component
function Scene({ config }) {
  const { type = 'Window' } = config || {}

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      
      {type === 'Door' ? (
        <Door3D config={config} position={[0, 0, 0]} />
      ) : (
        <Window3D config={config} position={[0, 0, 0]} />
      )}

      {/* Floor reflection plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={0xeeeeee} roughness={0.8} />
      </mesh>

      <OrbitControls 
        enablePan={false} 
        minDistance={1} 
        maxDistance={5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="city" />
    </>
  )
}

// Fallback loading component
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-600">Loading 3D Preview...</p>
      </div>
    </div>
  )
}

// Main export component
export function DoorWindow3DPreview({ config, className = '' }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <LoadingFallback />
  }

  return (
    <div className={`relative w-full h-full min-h-[300px] rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene config={config} />
        </Canvas>
      </Suspense>
      
      {/* Info overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <span>{config?.type || 'Window'} • {config?.category || 'Sliding'}</span>
        <span>{config?.width || 1200}mm x {config?.height || 1500}mm</span>
      </div>
      
      {/* Interaction hint */}
      <div className="absolute top-3 right-3 text-xs text-slate-500 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1">
        🔄 Drag to rotate
      </div>
    </div>
  )
}

export default DoorWindow3DPreview
