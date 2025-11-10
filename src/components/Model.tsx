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
                // Улучшаем материалы для лучшей видимости
                mat.metalness = mat.metalness || 0
                mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.4
                // Увеличиваем emissive для подсветки темных областей
                if (!mat.emissive) {
                  mat.emissive = new THREE.Color(0x000000)
                }
                mat.emissiveIntensity = 0.1
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
        {/* Улучшенное освещение для лучшей видимости модели */}
        {/* Базовое освещение - увеличено для устранения затемнения */}
        <ambientLight intensity={1.2} />
        <hemisphereLight 
          intensity={0.8}
          color="#ffffff"
          groundColor="#e0e0e0"
        />
        
        {/* Основные источники света с разных сторон для равномерного освещения */}
        <directionalLight 
          position={[5, 8, 5]} 
          intensity={1.5}
          color="#ffffff"
          castShadow={false}
        />
        <directionalLight 
          position={[-5, 8, -5]} 
          intensity={1.2}
          color="#ffffff"
          castShadow={false}
        />
        <directionalLight 
          position={[0, 10, 0]} 
          intensity={1.0}
          color="#ffffff"
          castShadow={false}
        />
        
        {/* Дополнительные источники для подсветки боковых сторон */}
        <directionalLight 
          position={[8, 2, 0]} 
          intensity={0.8}
          color="#ffffff"
          castShadow={false}
        />
        <directionalLight 
          position={[-8, 2, 0]} 
          intensity={0.8}
          color="#ffffff"
          castShadow={false}
        />
        
        {/* Point lights для подсветки темных областей */}
        <pointLight 
          position={[5, 3, 5]} 
          intensity={1.0}
          distance={25}
          color="#ffffff"
        />
        <pointLight 
          position={[-5, 3, -5]} 
          intensity={1.0}
          distance={25}
          color="#ffffff"
        />
        <pointLight 
          position={[0, -2, 0]} 
          intensity={0.6}
          distance={20}
          color="#ffffff"
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
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  )
}