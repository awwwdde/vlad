import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useRef, useMemo, useCallback, useEffect, useState } from 'react'

type ModelScale = [number, number, number]

interface BoundsInfo {
  radius: number
}

function Model({
  url,
  scale = [2.5, 2.5, 2.5],
  onBoundsComputed
}: {
  url: string
  scale?: ModelScale
  onBoundsComputed?: (info: BoundsInfo) => void
}) {
  const { scene } = useGLTF(url)
  const emissiveFallback = useMemo(() => new THREE.Color(0x1a1a1a), [])

  // Оптимизация: клонируем сцену и обрабатываем материалы только один раз
  const { clonedScene, radius } = useMemo(() => {
    const cloned = scene.clone(true)

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

          materials.forEach((mat: THREE.Material | undefined) => {
            if (!mat) return
            if (mat instanceof THREE.MeshStandardMaterial) {
              // Улучшаем материалы для лучшей видимости при черном фоне
              mat.metalness = mat.metalness ?? 0
              mat.roughness = mat.roughness ?? 0.35
              mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 0.5, 1.1)
              mat.emissive.copy(mat.emissive.isColor ? mat.emissive : emissiveFallback)
              mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0.1, 0.2)
            }
            mat.needsUpdate = true
          })
        }
      }
    })

    cloned.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.sub(center)

    const sphere = box.getBoundingSphere(new THREE.Sphere())

    return {
      clonedScene: cloned,
      radius: sphere.radius
    }
  }, [scene, emissiveFallback])

  useEffect(() => {
    if (radius && onBoundsComputed) {
      onBoundsComputed({ radius })
    }
  }, [radius, onBoundsComputed])

  return <primitive object={clonedScene} scale={scale} />
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

interface ModelViewerProps {
  modelPath: string
  scale?: ModelScale
}

interface SceneContentProps {
  modelPath: string
  scale: ModelScale
}

function LightingRig() {
  const keyLights = useMemo(
    () => [
      { position: [6, 10, 8] as [number, number, number], intensity: 2.1, color: '#f3f3ff' },
      { position: [-6, 8, -4] as [number, number, number], intensity: 1.6, color: '#fef7e2' },
      { position: [0, 6, -10] as [number, number, number], intensity: 1.5, color: '#e5f1ff' }
    ],
    []
  )

  return (
    <>
      <ambientLight intensity={1.4} color="#ffffff" />
      <hemisphereLight intensity={0.85} color="#ffffff" groundColor="#1a1a1a" />

      {keyLights.map(({ position, intensity, color }, index) => (
        <directionalLight
          key={`dir-${index}`}
          position={position}
          intensity={intensity}
          color={color}
        />
      ))}

      <spotLight
        position={[0, 15, 3]}
        angle={THREE.MathUtils.degToRad(35)}
        penumbra={0.4}
        intensity={2.2}
        decay={1}
        distance={60}
        color="#ffffff"
      />
      <pointLight position={[0, -6, 0]} intensity={0.9} distance={40} color="#bcd3ff" />
    </>
  )
}

function SceneContent({ modelPath, scale }: SceneContentProps) {
  const [bounds, setBounds] = useState<BoundsInfo | null>(null)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!bounds) return

    const perspectiveCamera = camera as THREE.PerspectiveCamera
    const maxScale = Math.max(...scale)
    const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov ?? 60)
    const boundingRadius = bounds.radius * maxScale
    const distance = boundingRadius / Math.sin(fov / 2)
    const safeDistance = distance * 1.2

    perspectiveCamera.position.set(0, 0, safeDistance)
    perspectiveCamera.near = Math.max(safeDistance * 0.01, 0.1)
    perspectiveCamera.far = safeDistance * 10
    perspectiveCamera.updateProjectionMatrix()
  }, [bounds, scale, camera])

  const handleBoundsComputed = useCallback((info: BoundsInfo) => {
    setBounds(info)
  }, [])

  return (
    <>
      <LightingRig />

      <Suspense fallback={<ModelLoader />}>
        <RotatingModel>
          <Model url={modelPath} scale={scale} onBoundsComputed={handleBoundsComputed} />
        </RotatingModel>
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate={false}
        minDistance={5}
        maxDistance={15}
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  )
}

export default function ModelViewer({ modelPath, scale }: ModelViewerProps) {
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
        <SceneContent modelPath={modelPath} scale={scale ?? [2.5, 2.5, 2.5]} />
      </Canvas>
    </div>
  )
}