import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    <path d="M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" />
    <line x1="10.5" y1="11" x2="10.5" y2="17" />
    <line x1="13.5" y1="11" x2="13.5" y2="17" />
  </Svg>
);

export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="4.5,12.5 9.5,17.5 19.5,6.5" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="5,8.5 12,15.5 19,8.5" />
  </Svg>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="5,15.5 12,8.5 19,15.5" />
  </Svg>
);

export const ArrowUpDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4v16" />
    <polyline points="3.5,7.5 7,4 10.5,7.5" />
    <path d="M17 20V4" />
    <polyline points="13.5,16.5 17,20 20.5,16.5" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="8.5,5 15.5,12 8.5,19" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="15.5,5 8.5,12 15.5,19" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="3.75" y1="6.75" x2="20.25" y2="6.75" />
    <line x1="3.75" y1="12" x2="20.25" y2="12" />
    <line x1="3.75" y1="17.25" x2="20.25" y2="17.25" />
  </Svg>
);

export const WalletIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M16 12.5h3.5a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H16a2 2 0 0 0 0 4Z" />
    <line x1="3" y1="8.5" x2="14" y2="8.5" />
  </Svg>
);

export const LandmarkIcon = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="12,3 21,8.5 3,8.5" />
    <line x1="4.5" y1="8.5" x2="4.5" y2="18.5" />
    <line x1="9.5" y1="8.5" x2="9.5" y2="18.5" />
    <line x1="14.5" y1="8.5" x2="14.5" y2="18.5" />
    <line x1="19.5" y1="8.5" x2="19.5" y2="18.5" />
    <line x1="3" y1="20.5" x2="21" y2="20.5" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="12,3.5 21,8.5 12,13.5 3,8.5" />
    <polyline points="3,13 12,18 21,13" />
    <polyline points="3,17.5 12,22.5 21,17.5" />
  </Svg>
);

export const ArrowUpRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
    <polyline points="8,6.5 17.5,6.5 17.5,16" />
  </Svg>
);

export const ArrowDownRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    <polyline points="17.5,8 17.5,17.5 8,17.5" />
  </Svg>
);

export const LogOutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
    <line x1="20" y1="12" x2="9.5" y2="12" />
    <polyline points="16,7.5 20.5,12 16,16.5" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12,7 12,12 15.5,14" />
  </Svg>
);

export const AlertCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="7.5" x2="12" y2="13" />
    <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const LoaderIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="2.5" x2="12" y2="6.5" opacity="1" />
    <line x1="12" y1="17.5" x2="12" y2="21.5" opacity="0.3" />
    <line x1="4.9" y1="4.9" x2="7.8" y2="7.8" opacity="0.4" />
    <line x1="16.2" y1="16.2" x2="19.1" y2="19.1" opacity="0.9" />
    <line x1="2.5" y1="12" x2="6.5" y2="12" opacity="0.5" />
    <line x1="17.5" y1="12" x2="21.5" y2="12" opacity="1" />
    <line x1="4.9" y1="19.1" x2="7.8" y2="16.2" opacity="0.7" />
    <line x1="16.2" y1="7.8" x2="19.1" y2="4.9" opacity="0.85" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 15.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2.5" />
    <polyline points="7.5,11 12,15.5 16.5,11" />
    <line x1="12" y1="3.5" x2="12" y2="15" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 8.5H14a5 5 0 0 1 0 10H8" />
    <polyline points="8,4 4,8.5 8,13" />
  </Svg>
);

export const InboxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12.5 6 5.5A1.5 1.5 0 0 1 7.4 4.5h9.2a1.5 1.5 0 0 1 1.4 1L20.5 12.5" />
    <path d="M3.5 12.5h5a.5.5 0 0 1 .48.36 3.2 3.2 0 0 0 6.14 0 .5.5 0 0 1 .48-.36h5V18a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18Z" />
  </Svg>
);

export const FilterIcon = (p: IconProps) => (
  <Svg {...p}>
    <polygon points="4,4.5 20,4.5 14,12 14,18 10,19.5 10,12" />
  </Svg>
);

export const CreditCardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <line x1="3" y1="9.5" x2="21" y2="9.5" />
    <line x1="6" y1="14.5" x2="10" y2="14.5" />
  </Svg>
);

export const BanknoteIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
    <circle cx="12" cy="12" r="2.75" />
    <line x1="6" y1="9.5" x2="6" y2="9.51" />
    <line x1="18" y1="14.5" x2="18" y2="14.51" />
  </Svg>
);

export const PiggyBankIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12.5a6 6 0 0 1 6-6h4a5.5 5.5 0 0 1 5 3.2l1.5.4a1 1 0 0 1 0 1.9l-1.5.5a5.5 5.5 0 0 1-1.5 2.4V17a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.5h-3V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-1.8a6 6 0 0 1-3.5-2.7Z" />
    <line x1="15" y1="9" x2="15" y2="9.01" />
    <line x1="7.5" y1="12.5" x2="4" y2="11" />
  </Svg>
);

export const HandCoinsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="7.5" r="3" />
    <path d="M3 20v-1.5a4 4 0 0 1 4-4h2a4 4 0 0 1 3.2 1.6" />
    <path d="M13 14.5h4.3a1.7 1.7 0 0 1 0 3.4H14" />
    <path d="M13 17.9h5a1.6 1.6 0 0 1 0 3.1h-4.5L11 19.5" />
  </Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.25" />
    <line x1="12" y1="2.5" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="21.5" />
    <line x1="4.4" y1="4.4" x2="6.2" y2="6.2" />
    <line x1="17.8" y1="17.8" x2="19.6" y2="19.6" />
    <line x1="2.5" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21.5" y2="12" />
    <line x1="4.4" y1="19.6" x2="6.2" y2="17.8" />
    <line x1="17.8" y1="6.2" x2="19.6" y2="4.4" />
  </Svg>
);

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 13.8A8.3 8.3 0 1 1 10.2 4a6.6 6.6 0 0 0 9.8 9.8Z" />
  </Svg>
);

export const EyeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3.5l17 17" />
    <path d="M10.6 5.65A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.3 15.3 0 0 1-3.15 4.06M6.55 6.55C4.1 8.15 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.4 9.4 0 0 0 3.4-.63" />
    <path d="M9.6 10.15a2.75 2.75 0 0 0 3.85 3.9" />
  </Svg>
);

export const RotateCcwIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4.5v5.5h5.5" />
    <path d="M4.3 14.5a8 8 0 1 0 1.6-8.4L4 9.5" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
    <line x1="8" y1="3" x2="8" y2="6.5" />
    <line x1="16" y1="3" x2="16" y2="6.5" />
  </Svg>
);

export const ChartBarIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="20.5" x2="20" y2="20.5" />
    <rect x="6" y="13" width="3.2" height="7.5" rx="0.8" />
    <rect x="10.4" y="8.5" width="3.2" height="12" rx="0.8" />
    <rect x="14.8" y="4.5" width="3.2" height="16" rx="0.8" />
  </Svg>
);

export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="8" height="8" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
    <rect x="3.5" y="13.5" width="8" height="7" rx="1.5" />
  </Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3.5 19.5v-1a5.5 5.5 0 0 1 11 0v1" />
    <path d="M16.5 5.75a3.25 3.25 0 0 1 0 6.34" />
    <path d="M18.75 19.5v-1a5.5 5.5 0 0 0-3.2-5" />
  </Svg>
);

export const ArrowLeftRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8h14" />
    <polyline points="13.5,4 17.5,8 13.5,12" />
    <path d="M20.5 16h-14" />
    <polyline points="10.5,12 6.5,16 10.5,20" />
  </Svg>
);

export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11V8a3 3 0 0 1 3-3h11" />
    <polyline points="14,1.5 18,5 14,8.5" />
    <path d="M20 13v3a3 3 0 0 1-3 3H6" />
    <polyline points="10,15.5 6,19 10,22.5" />
  </Svg>
);

export const SmartphoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="2" />
    <line x1="6" y1="18" x2="18" y2="18" />
    <circle cx="12" cy="15.2" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
);

export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.5 3.5H6a2.5 2.5 0 0 0-2.5 2.5v5.5a1 1 0 0 0 .3.7l9.3 9.3a1.5 1.5 0 0 0 2.1 0l6.1-6.1a1.5 1.5 0 0 0 0-2.1l-9.3-9.3a1 1 0 0 0-.5-.5Z" />
    <circle cx="8.2" cy="8.2" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.75" />
    <path d="M12 3.5v2.4M12 18.1v2.4M6.4 6.4l1.7 1.7M15.9 15.9l1.7 1.7M3.5 12h2.4M18.1 12h2.4M6.4 17.6l1.7-1.7M15.9 8.1l1.7-1.7" />
  </Svg>
);

export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="5" y1="21" x2="5" y2="14" />
    <line x1="5" y1="10" x2="5" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="19" y1="21" x2="19" y2="16" />
    <line x1="19" y1="12" x2="19" y2="3" />
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="10" r="2" />
    <circle cx="19" cy="14" r="2" />
  </Svg>
);
