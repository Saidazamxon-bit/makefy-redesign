import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function ContainerScroll({ children, className = '', style = {} }) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [18, -12]),
    { stiffness: 110, damping: 22, mass: 0.7 }
  );

  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 1.04]),
    { stiffness: 110, damping: 22, mass: 0.7 }
  );

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [120, -60]),
    { stiffness: 110, damping: 22, mass: 0.7 }
  );

  return (
    <div
      ref={containerRef}
      className={['relative mx-auto w-full max-w-[620px]', className].filter(Boolean).join(' ')}
      style={style}
    >
      <motion.div
        className="relative w-full [perspective:1600px]"
        style={
          shouldReduceMotion
            ? undefined
            : {
                rotateX,
                scale,
                y,
                transformPerspective: 1600,
              }
        }
      >
        <div className="relative overflow-hidden rounded-[28px] border border-slate-700/80 bg-slate-950/70 shadow-[0_35px_90px_rgba(5,12,20,0.7)] backdrop-blur-sm">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
