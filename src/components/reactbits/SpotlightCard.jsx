import { useRef, useEffect } from 'react';
import './SpotlightCard.css';

const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(255, 255, 255, 0.25)' }) => {
  const divRef = useRef(null);
  const rectRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      rectRef.current = null;
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = e => {
    if (!rectRef.current && divRef.current) rectRef.current = divRef.current.getBoundingClientRect();
    const rect = rectRef.current || divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    divRef.current.style.setProperty('--mouse-x', `${x}px`);
    divRef.current.style.setProperty('--mouse-y', `${y}px`);
    divRef.current.style.setProperty('--spotlight-color', spotlightColor);
  };

  const handleMouseEnter = () => {
    if (divRef.current) rectRef.current = divRef.current.getBoundingClientRect();
  };

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} onMouseEnter={handleMouseEnter} className={`card-spotlight ${className}`}>
      {children}
    </div>
  );
};

export default SpotlightCard;
