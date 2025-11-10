import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useRef, useMemo, useCallback, useEffect } from 'react'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  
  // Оптимизация: клонируем сцену и обрабатываем материалы только один раз
  const clonedScene = useMemo(() => {
    const cloned = scene.clone()
    
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          
          materials.forEach((mat: THREE.Material) => {
            if (mat) {
              mat.needsUpdate = true
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.metalness = mat.metalness || 0
                mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.5
              }
            }
          })
        }
      }
    })
    
    return cloned
  }, [scene])
  
  return (
    <primitive 
      object={clonedScene} 
      scale={[2.5, 2.5, 2.5]}
    />
  )
}

function ModelLoader() {
  return (
    <Html center>
      <div className="text-black">Loading 3D model...</div>
    </Html>
  )
}

function RotatingModel(props: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Оптимизация: используем useCallback для стабильной ссылки
  const rotate = useCallback((delta: number) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2
    }
  }, [])
  
  useFrame((_, delta) => {
    rotate(delta)
  })
  
  return (
    <group ref={groupRef} {...props}>
      {props.children}
    </group>
  )
}

export default function ModelViewer({ modelPath }: { modelPath: string }) {
  // Предзагрузка модели при монтировании компонента
  useEffect(() => {
    useGLTF.preload(modelPath)
  }, [modelPath])
  
  // Оптимизация: мемоизируем конфигурацию камеры
  const cameraConfig = useMemo(() => ({
    position: [0, 0, 7] as [number, number, number],
    fov: 60
  }), [])
  
  return (
    <div className="w-full h-full overflow-hidden">
      <Canvas
        camera={cameraConfig}
        className="bg-transparent w-full h-full"
        frameloop="always"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Оптимизированное освещение: уменьшено количество источников */}
        <ambientLight intensity={0.6} />
        <hemisphereLight 
          intensity={0.4}
          color="#ffffff"
          groundColor="#b9b9b9"
        />
        
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.0}
          castShadow={false}
        />
        <directionalLight 
          position={[-5, -5, -5]} 
          intensity={0.6}
          color="#ffffff"
        />
        <directionalLight 
          position={[0, 10, 0]} 
          intensity={0.5}
          color="#ffffff"
        />
        
        {/* Оптимизация: объединены point lights в один с большей интенсивностью */}
        <pointLight 
          position={[0, 0, 0]} 
          intensity={0.8}
          distance={30}
        />
        
        <Suspense fallback={<ModelLoader />}>
          <RotatingModel>
            <Model url={modelPath} />
          </RotatingModel>
        </Suspense>
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          enableRotate={true} 
          autoRotate={false} 
          minDistance={5}
          maxDistance={15}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  )
}