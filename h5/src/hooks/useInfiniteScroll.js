import { useEffect, useRef } from 'react';

export default function useInfiniteScroll(callback, { hasMore, loading }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, callback]);

  return sentinelRef;
}
