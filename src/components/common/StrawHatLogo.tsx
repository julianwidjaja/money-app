import { cn } from '@/lib/utils'

interface StrawHatLogoProps {
  className?: string
}

export function StrawHatLogo({ className }: StrawHatLogoProps) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-8 h-5', className)}
    >
      {/* Hat brim */}
      <ellipse cx="32" cy="32" rx="30" ry="8" fill="currentColor" opacity="0.9" />
      {/* Hat band (red) */}
      <rect x="12" y="20" width="40" height="6" rx="2" fill="#dc2626" />
      {/* Hat dome */}
      <path
        d="M14 22C14 22 16 4 32 4C48 4 50 22 50 22"
        fill="currentColor"
        opacity="0.85"
      />
      {/* Hat dome outline */}
      <path
        d="M14 22C14 22 16 4 32 4C48 4 50 22 50 22"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
      />
      {/* Straw texture lines */}
      <path d="M22 10C24 8 28 6 32 6C36 6 40 8 42 10" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
      <path d="M18 16C22 13 26 11 32 11C38 11 42 13 46 16" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
    </svg>
  )
}
