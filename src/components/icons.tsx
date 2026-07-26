/**
 * Lucide glyphs, transcribed by hand as inline SVG.
 *
 * The revamp adds no dependencies, so there is no icon package — these are
 * the handful of Lucide paths the interface actually uses. All of them are
 * stroked in currentColor with no fill, at stroke-width 2 (2.5 for the small
 * chrome glyphs where a 2px stroke reads thin at 15px).
 */

type IconProps = {
  size?: number
  strokeWidth?: number
  className?: string
}

function Svg({
  size = 16,
  strokeWidth = 2,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.5}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const MenuIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.5}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
)

export const CartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4h2l2.6 11h10.2L20 7H7" />
    <circle cx="9" cy="19" r="1.4" />
    <circle cx="18" cy="19" r="1.4" />
  </Svg>
)

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
  </Svg>
)

export const CompareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h6M4 12h10M4 18h4" />
    <path d="M18 4v16" />
  </Svg>
)

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={p.strokeWidth ?? 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
  </svg>
)

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 6-6 6 6 6" />
  </Svg>
)

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m10 6 6 6-6 6" />
  </Svg>
)

export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </Svg>
)

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
)

export const FilterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M6 12h12M10 18h4" />
  </Svg>
)

export const CloseIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.5}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.5}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
)

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14" />
  </Svg>
)
