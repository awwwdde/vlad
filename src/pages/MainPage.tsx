import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import ModelViewer from '../components/Model';
import Marquee from '../components/Marquee';
import { motion } from 'framer-motion';


const LEFT_MARQUEE_ITEMS = [
  'React',
  'TypeScript',
  'Three.js',
  'Framer Motion',
  'Shadcn/UI',
  'Frontend Development',
];

const RIGHT_MARQUEE_ITEMS = [
  'UI/UX Design',
  'Next.js',
  'Tailwind CSS',
  'Creative Coding',
  'Responsive Design',
  'Performance Optimization',
];

const MainPage: React.FC = () => {
  useEffect(() => {
    useGLTF.preload('/logo.glb');
  }, []);

  return (
    <div className="relative w-full min-h-screen text-center bg-black">
      <div className="relative w-full h-screen flex overflow-hidden">
        <div className="m-0 px-10 w-[1700px] pt-[80px] z-[3] flex mx-auto">
          <img 
            src="/AWWWDDE.svg" 
            alt="AWWWDDE" 
            className="w-full h-auto max-h-[250px] object-contain"
          />
        </div>
        <div className="absolute bottom-[50px] left-40 z-[3] flex max-w-[800px] flex-col gap-2 text-left">
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] max-w-[600px] w-full px-4 ">
          <img 
            src="/sky.png" 
            alt="Clouds" 
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
      <div className="relative w-full z-[3] bg-black">
        <Marquee
          leftItems={LEFT_MARQUEE_ITEMS}
          rightItems={RIGHT_MARQUEE_ITEMS}
          velocity={40}
          className="py-4"
        />
      </div>
      <div className="relative w-full min-h-screen bg-black">
      </div>
    </div>
  );
};

export default MainPage;