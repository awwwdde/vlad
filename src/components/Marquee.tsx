import React, { useRef, useLayoutEffect, useState, useMemo } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'motion/react';

interface MarqueeProps {
  leftItems: string[];
  rightItems: string[];
  velocity?: number;
  className?: string;
  damping?: number;
  stiffness?: number;
  textClassName?: string;
  numCopies?: number;
}

function useElementWidth<T extends HTMLElement>(ref: React.RefObject<T | null>): number {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) {
        const firstSpan = ref.current.querySelector('span:first-child') as HTMLElement;
        if (firstSpan) {
          setWidth(firstSpan.offsetWidth);
        }
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [ref]);

  return width;
}

function wrap(min: number, max: number, v: number): number {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

const Marquee: React.FC<MarqueeProps> = ({
  leftItems,
  rightItems,
  velocity = 50,
  className = '',
  damping = 50,
  stiffness = 400,
  textClassName = 'text-[#F4F4F6] text-[20px] font-feature-mono',
  numCopies = 6
}) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftBaseX = useMotionValue(0);
  const rightBaseX = useMotionValue(0);
  const leftWidth = useElementWidth(leftRef);
  const rightWidth = useElementWidth(rightRef);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: damping ?? 50,
    stiffness: stiffness ?? 400
  });
  const velocityFactor = useTransform(
    smoothVelocity,
    [0, 1000],
    [0, 5],
    { clamp: false }
  );
  const leftX = useTransform(leftBaseX, v => {
    if (leftWidth === 0) return '0px';
    return `${wrap(-leftWidth, 0, v)}px`;
  });

  useAnimationFrame((_, delta) => {
    if (leftWidth === 0) return;
    let moveBy = -velocity * (delta / 1000);
    const multiplier = 1 + Math.abs(velocityFactor.get());
    moveBy = moveBy * multiplier;
    
    leftBaseX.set(leftBaseX.get() + moveBy);
  });
  useLayoutEffect(() => {
    if (rightWidth > 0 && rightBaseX.get() === 0) {
      rightBaseX.set(-rightWidth);
    }
  }, [rightWidth, rightBaseX]);

  const rightX = useTransform(rightBaseX, v => {
    if (rightWidth === 0) return '0px';
    return `${wrap(-rightWidth, 0, v)}px`;
  });

  useAnimationFrame((_, delta) => {
    if (rightWidth === 0) return;
    let moveBy = velocity * (delta / 1000);
    const multiplier = 1 + Math.abs(velocityFactor.get());
    moveBy = moveBy * multiplier;
    
    rightBaseX.set(rightBaseX.get() + moveBy);
  });
  const leftItemsText = useMemo(() => {
    return leftItems.join(' | ') + ' | ';
  }, [leftItems]);

  const rightItemsText = useMemo(() => {
    return rightItems.join(' | ') + ' | ';
  }, [rightItems]);
  const leftSpans = [];
  for (let i = 0; i < numCopies; i++) {
    leftSpans.push(
      <span
        key={`left-${i}`}
        className={`flex-shrink-0 ${textClassName}`}
      >
        {leftItemsText}
      </span>
    );
  }

  const rightSpans = [];
  for (let i = 0; i < numCopies; i++) {
    rightSpans.push(
      <span
        key={`right-${i}`}
        className={`flex-shrink-0 ${textClassName}`}
      >
        {rightItemsText}
      </span>
    );
  }

  return (
    <motion.div
      className={`relative w-full overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div ref={leftRef} className="relative overflow-hidden">
        <motion.div
          className="flex whitespace-nowrap will-change-transform"
          style={{ x: leftX, gap: '5px' }}
        >
          {leftSpans}
        </motion.div>
      </div>
      <div ref={rightRef} className="relative overflow-hidden mt-4">
        <motion.div
          className="flex whitespace-nowrap will-change-transform"
          style={{ x: rightX, gap: '5px' }}
        >
          {rightSpans}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Marquee;
