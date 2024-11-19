import { ReactNode, useEffect, useRef } from "react";

export function ImpressionArea({ onImpressed, children }: { onImpressed: () => void; children: ReactNode }) {
  const handleOnImpressedRef = useRef(onImpressed);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    handleOnImpressedRef.current = onImpressed;
  }, [onImpressed]);

  useEffect(() => {
    const area = areaRef.current;
    if (!area) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleOnImpressedRef.current();
        }
      },
      {
        rootMargin: "0px",
        threshold: 0.1,
      }
    );
    observer.observe(area);
    return () => observer.unobserve(area);
  }, []);

  return <div ref={areaRef}>{children}</div>;
}
