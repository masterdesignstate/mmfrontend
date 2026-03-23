'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface NavLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function NavLogo({ width = 32, height = 32, className = 'object-contain' }: NavLogoProps) {
  const router = useRouter();

  const handleClick = () => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      router.push('/results');
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <Image
      src="/assets/mmlogox.png"
      alt="mm logo"
      width={width}
      height={height}
      className={`${className} cursor-pointer`}
      onClick={handleClick}
    />
  );
}
