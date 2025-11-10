import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import ModelViewer from '../components/Model';

const MainPage: React.FC = () => {
  // Предзагрузка модели сразу при загрузке страницы
  useEffect(() => {
    useGLTF.preload('/logo.glb');
  }, []);

  return (
    <div className="relative w-full h-screen flex justify-center items-center overflow-hidden text-center">
      <h1 className="text-[clamp(20px,4vw,60px)] font-black m-0 px-5 uppercase font-sans text-black z-[1] text-center">
        Web Designer & Frontend Developer
      </h1>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-full h-full z-[2]">
        <ModelViewer modelPath="/logo.glb" />
      </div>
    </div>
  );
};

export default MainPage;