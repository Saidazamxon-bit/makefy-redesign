import { ReactLenis } from 'lenis/react';
import { useEffect, useState } from 'react';

export default function SmoothScroll({ children }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  if (reduced) return children;

  // Tuned options: responsive, slightly inertial, not too slow.
  const lenisOptions = {
    duration: 1.0,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smooth: true,
    // Enable wheel & touch smoothing but allow native behavior to prevail where needed.
    smoothWheel: true,
    smoothTouch: true,
    infinite: false,
  };

  return <ReactLenis root options={lenisOptions}>{children}</ReactLenis>;
}
