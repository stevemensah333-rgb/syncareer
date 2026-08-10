import React, { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with lazy loading support.
 * Automatically uses native lazy loading and provides fallback for older browsers.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  title,
  className = '',
  width,
  height,
  lazy = true,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      onLoad={handleLoad}
      onError={onError}
      decoding="async"
    />
  );
};
