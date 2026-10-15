import { useRef, useEffect } from 'react';
import './GlareHover.css';

export default function GlareHover({
  children,
  className = '',
  width = '100%',
  height = '100%',
  borderRadius = 'inherit',
  glareColor = '#ffffff',
  glareOpacity = 0.16,
  glareAngle = -30,
  glareSize = 250,
  transitionDuration = 650,
  playOnce = false,
}) {
  const ref = useRef(null);
  const rectRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      rectRef.current = null;
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function updateGlare(event) {
    const node = ref.current;
    if (!node) return;
    if (!rectRef.current) rectRef.current = node.getBoundingClientRect();
    const rect = rectRef.current;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty('--gh-x', `${x}%`);
    node.style.setProperty('--gh-y', `${y}%`);
    node.style.setProperty('--gh-opacity', String(glareOpacity));
  }

  function handleMouseEnter() {
    if (ref.current) rectRef.current = ref.current.getBoundingClientRect();
  }

  function handleEnter() {
    if (ref.current && playOnce && ref.current.dataset.played === 'true') return;
    if (ref.current) ref.current.dataset.played = 'true';
  }

  return (
    <div
      ref={ref}
      className={`glare-hover ${className}`}
      onMouseMove={updateGlare}
      onMouseEnter={handleMouseEnter}
      onMouseEnter={handleEnter}
      style={{
        width,
        height,
        borderRadius,
        '--gh-color': glareColor,
        '--gh-angle': `${glareAngle}deg`,
        '--gh-size': `${glareSize}px`,
        '--gh-transition': `${transitionDuration}ms`,
      }}
    >
      {children}
    </div>
  );
}