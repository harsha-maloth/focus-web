// Simple line icons for the tab bar. Drawn for this project; they inherit the text colour.
const common = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const

export const HomeIcon = () => (
  <svg {...common}>
    <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />
  </svg>
)
export const HistoryIcon = () => (
  <svg {...common}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
export const StatsIcon = () => (
  <svg {...common}>
    <path d="M6 20v-6M12 20V6M18 20v-9" />
  </svg>
)
export const SettingsIcon = () => (
  <svg {...common}>
    <path d="M5 8h9M18 8h1M5 16h1M10 16h9" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="8" cy="16" r="2" />
  </svg>
)
