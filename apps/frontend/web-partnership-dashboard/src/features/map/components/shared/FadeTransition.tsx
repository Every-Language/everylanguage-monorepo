import React from 'react';

interface FadeOnMountProps {
  children: React.ReactNode;
  className?: string;
  durationMs?: number;
}

/**
 * Simple fade-in animation component that triggers on mount.
 * Fades in from opacity 0 with a slight upward movement.
 */
export const FadeOnMount: React.FC<FadeOnMountProps> = ({
  children,
  className,
  durationMs = 180,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Start hidden, then fade in next frame
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    el.style.willChange = 'opacity, transform';

    const id = requestAnimationFrame(() => {
      el.style.transition = `opacity ${durationMs}ms ease, transform ${durationMs}ms ease`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    return () => cancelAnimationFrame(id);
  }, [durationMs]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

interface FadeSwitchProps {
  switchKey: React.Key;
  children: React.ReactNode;
  className?: string;
  durationMs?: number;
}

/**
 * Convenience wrapper that re-mounts FadeOnMount whenever switchKey changes.
 * Useful for animating content transitions.
 */
export const FadeSwitch: React.FC<FadeSwitchProps> = ({
  switchKey,
  children,
  className,
  durationMs,
}) => {
  return (
    <FadeOnMount key={switchKey} className={className} durationMs={durationMs}>
      {children}
    </FadeOnMount>
  );
};
