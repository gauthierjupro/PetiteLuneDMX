import React from 'react';
import { Box } from 'lucide-react';
import { isAllowedProfileImageUrl } from '../../utils/fixtureProfileImage';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'w-10 h-10 rounded-lg',
  md: 'w-14 h-14 rounded-xl',
  lg: 'w-24 h-24 rounded-2xl',
};

interface FixtureProfilePhotoProps {
  src?: string | null;
  alt: string;
  size?: Size;
  className?: string;
}

export function FixtureProfilePhoto({
  src,
  alt,
  size = 'md',
  className = '',
}: FixtureProfilePhotoProps) {
  const box = SIZE_CLASS[size];
  if (src && isAllowedProfileImageUrl(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${box} object-cover border border-white/10 bg-slate-900 shrink-0 ${className}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={`${box} border border-white/10 bg-slate-800/90 flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      <Box className="w-[45%] h-[45%] text-slate-600" />
    </div>
  );
}
