import React from 'react';
import { sound } from '../../utils/sound';

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'mint' | 'yellow' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  children,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    sound.playPop();
    if (onClick) onClick(e);
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-b from-[#b8a4f9] to-[#9a7ff3] text-white shadow-[#9a7ff3]/30 hover:brightness-105',
    accent:
      'bg-gradient-to-b from-[#ff9aa2] to-[#ff7b88] text-white shadow-[#ff7b88]/30 hover:brightness-105',
    mint:
      'bg-gradient-to-b from-[#8de8cd] to-[#5cd6b0] text-slate-800 shadow-[#5cd6b0]/30 hover:brightness-105',
    yellow:
      'bg-gradient-to-b from-[#fed330] to-[#f7b731] text-slate-900 shadow-[#f7b731]/30 hover:brightness-105',
    danger:
      'bg-gradient-to-b from-[#ff7675] to-[#d63031] text-white shadow-[#d63031]/30 hover:brightness-105',
    ghost:
      'bg-white/80 text-slate-700 hover:bg-white shadow-slate-300/30 border border-slate-200/60',
  }[variant];

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
    xl: 'px-8 py-5 text-xl font-bold tracking-wide gap-3',
  }[size];

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        clay-button cursor-pointer active:scale-95 transition-all
        ${variantStyles}
        ${sizeStyles}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
