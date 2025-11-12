import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import ModelViewer from '../components/Model';
import { motion } from 'framer-motion';


const MainPage: React.FC = () => {
  useEffect(() => {
    useGLTF.preload('/logo.glb');
  }, []);

  return (
    <div className="relative w-full h-screen flex overflow-hidden text-center bg-black">
      <div className="m-0 px-10 pt-[80px] w-full z-[3] flex ">
        <img 
          src="/AWWWDDE.svg" 
          alt="AWWWDDE" 
          className="w-full h-auto max-h-[250px] object-contain"
        />
      </div>
      <div className="absolute bottom-[50px] left-10 z-[3] flex max-w-[800px] flex-col gap-2 text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-[20px] font-regular text-[#F4F4F6] leading-tight font-feature-mono"
          >
            WEB DESIGNER & FRONTEND DEVELOPER 
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="text-[36px] font-medium text-[#F4F4F6] leading-tight font-neue-haas"
          >
            I create websites — not as digital constructions, but as spaces where human thoughts, emotions, and technologies meet.
          </motion.div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-full h-full z-[2]">
        <ModelViewer modelPath="/logo.glb" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] max-w-[800px] w-full px-4 ">
        <img 
          src="/me.jpg" 
          alt="Me" 
          className="w-full h-auto object-contain"
        />
      </div>
    </div>
  );
};

export default MainPage;