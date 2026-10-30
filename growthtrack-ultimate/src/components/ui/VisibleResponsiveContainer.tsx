import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ResponsiveContainer } from 'recharts';

/** Reserve chart geometry immediately; mount its heavy renderer only after viewport admission. */
export default function VisibleResponsiveContainer({ children, width = '100%', height = '100%', ...props }: ComponentProps<typeof ResponsiveContainer>) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver !== 'function');
  useEffect(() => {
    if (visible || !ref.current || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: '120px' });
    observer.observe(ref.current); return () => observer.disconnect();
  }, [visible]);
  return <div ref={ref} className="kinetic-chart-viewport" style={{ width, height: props.aspect ? 'auto' : height, aspectRatio: props.aspect, minHeight: props.minHeight, minWidth: props.minWidth || 0 }} data-chart-visible={visible}>
    {visible ? <ResponsiveContainer {...props} width="100%" height="100%">{children}</ResponsiveContainer> : <span className="kinetic-chart-placeholder" aria-hidden="true" />}
  </div>;
}
