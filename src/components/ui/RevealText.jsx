import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Silliq matn paydo bo'lish animatsiyasi (Framer Motion)
export function RevealText({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  y = 20,
  blur = true,
  once = true,
  as = 'div',
}) {
  const Component = motion[as] || motion.div;

  return (
    <Component
      initial={{
        opacity: 0,
        y,
        filter: blur ? 'blur(8px)' : 'none',
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: blur ? 'blur(0px)' : 'none',
      }}
      viewport={{ once, margin: '-40px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </Component>
  );
}

// So'zlarni ketma-ket paydo bo'lish animatsiyasi (Staggered Words Reveal)
export function RevealWords({
  text,
  className = '',
  delay = 0,
  staggerDelay = 0.045,
  duration = 0.5,
  once = true,
}) {
  if (typeof text !== 'string') return <span>{text}</span>;

  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 18,
      filter: 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.2, 0.8, 0.2, 1],
      },
    },
  };

  return (
    <motion.span
      className={cn('inline-block', className)}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-30px' }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariants}
          className="inline-block mr-[0.28em] last:mr-0"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Bo'lim sarlavhalari uchun maxsus animatsiya
export function SectionHeaderReveal({
  eyebrow,
  title,
  subtitle,
  className = '',
  align = 'left',
}) {
  return (
    <div className={cn('makefy-reveal-header', align === 'center' ? 'text-center' : '', className)}>
      {eyebrow && (
        <RevealText delay={0.05} y={12} duration={0.45}>
          <span className="makefy-home-section__eyebrow">{eyebrow}</span>
        </RevealText>
      )}

      {title && (
        <RevealText delay={0.15} y={18} duration={0.6}>
          <h2>{title}</h2>
        </RevealText>
      )}

      {subtitle && (
        <RevealText delay={0.25} y={16} duration={0.55}>
          <p className="makefy-home-section__text">{subtitle}</p>
        </RevealText>
      )}
    </div>
  );
}

export default RevealText;
