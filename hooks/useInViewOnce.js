// hooks/useInViewOnce.js
import { useEffect, useRef, useState } from "react";

export default function useInViewOnce(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect(); // 🔥 only once
      }
    }, options);

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}
