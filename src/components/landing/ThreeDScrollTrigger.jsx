import { createContext, useContext, useEffect, useMemo, useRef, Children } from 'react';

export const wrap = (min, max, value) => {
  const rangeSize = max - min;
  return ((((value - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

const ThreeDScrollTriggerContext = createContext({
  getVelocity: () => 0,
});

export function ThreeDScrollTriggerContainer({ children, className = '', ...props }) {
  // Use a single global velocity ref and single global scroll listener
  // to avoid attaching multiple scroll handlers across pages.
  if (typeof window !== 'undefined') {
    window.__mf_three_targetVelocity = window.__mf_three_targetVelocity || { current: 0 };
    window.__mf_three_decayTimeout = window.__mf_three_decayTimeout || null;
  }
  const fallbackRef = useRef(0);
  const targetVelocityRef = (typeof window !== 'undefined' && window.__mf_three_targetVelocity) || fallbackRef;
  const lastScrollY = useRef(0);
  const lastTime = useRef(0);
  const decayTimeoutRef = useRef(null);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    lastTime.current = performance.now();

    // Install a single scroll listener on window once and keep
    // the velocity in a shared global ref. This reduces duplicate
    // listeners when this component is mounted multiple times.
    const installGlobalScroll = () => {
      if (typeof window === 'undefined') return;
      if (window.__mf_three_scroll_installed) return;

      const handleScroll = () => {
        const now = performance.now();
        const dt = now - lastTime.current;
        if (dt <= 0) return;

        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollY.current;
        const instantVelocity = (deltaY / Math.max(6, dt)) * 1000;
        window.__mf_three_targetVelocity.current = Math.max(-2500, Math.min(2500, instantVelocity));

        lastScrollY.current = currentScrollY;
        lastTime.current = now;

        if (window.__mf_three_decayTimeout) clearTimeout(window.__mf_three_decayTimeout);
        window.__mf_three_decayTimeout = setTimeout(() => {
          window.__mf_three_targetVelocity.current = 0;
        }, 50);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.__mf_three_scroll_installed = true;
    };

    installGlobalScroll();
    return () => {
      // We intentionally do not remove the global scroll listener here
      // because other instances may rely on it. It remains installed.
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      getVelocity: () => targetVelocityRef.current,
    }),
    []
  );

  return (
    <ThreeDScrollTriggerContext.Provider value={contextValue}>
      <div className={`relative w-full overflow-hidden [perspective:1200px] ${className}`.trim()} {...props}>
        {children}
      </div>
    </ThreeDScrollTriggerContext.Provider>
  );
}

export function ThreeDScrollTriggerRow({
  children,
  baseVelocity = 5,
  direction = 1,
  tiltEffect = true,
  className = '',
  ...props
}) {
  const context = useContext(ThreeDScrollTriggerContext);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const singleBlockRef = useRef(null);

  const xRef = useRef(0);
  const unitWidthRef = useRef(0);
  const smoothVelocityRef = useRef(0);
  const smoothTiltRef = useRef(0);
  const isInViewRef = useRef(false);
  const rafIdRef = useRef(null);
  const startAnimationRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      if (singleBlockRef.current) {
        const rect = singleBlockRef.current.getBoundingClientRect();
        unitWidthRef.current = rect.width || singleBlockRef.current.offsetWidth || 0;
      }
    };
    measure();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && singleBlockRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(singleBlockRef.current);
    }
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      isInViewRef.current = true;
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasInView = isInViewRef.current;
        isInViewRef.current = entry && entry.isIntersecting;
        if (isInViewRef.current && !wasInView && startAnimationRef.current) {
          startAnimationRef.current();
        }
      },
      { rootMargin: '250px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now) => {
      if (!isInViewRef.current) return;

      const dt = Math.min(0.04, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const targetVelocity = context?.getVelocity?.() || 0;
      const lerpFactor = 1 - Math.exp(-12 * dt);
      smoothVelocityRef.current += (targetVelocity - smoothVelocityRef.current) * lerpFactor;

      const unitWidth = unitWidthRef.current;
      if (unitWidth > 0) {
        const baseSpeed = Math.abs(baseVelocity) * 26;
        const scrollBoost = Math.abs(smoothVelocityRef.current) * 0.45;
        const isScrollingUp = smoothVelocityRef.current < -30;
        const scrollDirection = isScrollingUp ? -1 : 1;
        const effectiveDirection = direction * scrollDirection;
        const currentSpeed = effectiveDirection * (baseSpeed + scrollBoost);
        const moveDelta = currentSpeed * dt;

        xRef.current += moveDelta;
        xRef.current = ((xRef.current % unitWidth) + unitWidth) % unitWidth;

        let tiltTransform = '';
        if (tiltEffect) {
          const targetTilt = Math.max(-4.5, Math.min(4.5, (currentSpeed / 200) * 1.8));
          const tiltLerp = 1 - Math.exp(-14 * dt);
          smoothTiltRef.current += (targetTilt - smoothTiltRef.current) * tiltLerp;
          tiltTransform = ` skewX(${-smoothTiltRef.current}deg)`;
        }

        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${-xRef.current}px, 0, 0)${tiltTransform}`;
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    startAnimationRef.current = () => {
      lastTime = performance.now();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    if (isInViewRef.current) {
      startAnimationRef.current();
    }

    return () => {
      startAnimationRef.current = null;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [baseVelocity, direction, tiltEffect, context]);

  const childList = useMemo(() => Children.toArray(children), [children]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden whitespace-nowrap [perspective:1200px] ${className}`.trim()}
      {...props}
    >
      <div
        ref={trackRef}
        className="inline-flex will-change-transform transform-gpu select-none"
        style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
      >
        <div ref={singleBlockRef} className="inline-flex shrink-0">
          {childList}
        </div>
        <div className="inline-flex shrink-0" aria-hidden="true">
          {childList}
        </div>
        <div className="inline-flex shrink-0" aria-hidden="true">
          {childList}
        </div>
        <div className="inline-flex shrink-0" aria-hidden="true">
          {childList}
        </div>
      </div>
    </div>
  );
}

export default ThreeDScrollTriggerRow;
