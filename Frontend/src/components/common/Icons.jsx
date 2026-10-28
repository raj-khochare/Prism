import React from 'react';

/**
 * PRISM Bespoke Functional Icon System
 * Clean, technical, geometric SVG icons.
 * Strict replacement for Lucide - zero external dependencies, no decorative fluff.
 */

const baseSvg = (pathContent, { size = 14, color = 'currentColor', className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="square"
    strokeLinejoin="miter"
    className={`prism-icon ${className}`}
    aria-hidden="true"
    {...props}
  >
    {pathContent}
  </svg>
);

export const Shield = (p) =>
  baseSvg(
    <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />,
    p
  );

export const ShieldAlert = (p) =>
  baseSvg(
    <>
      <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>,
    p
  );

export const ShieldCheck = (p) =>
  baseSvg(
    <>
      <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
      <polyline points="9 12 11 14 15 10" />
    </>,
    p
  );

export const AlertTriangle = (p) =>
  baseSvg(
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>,
    p
  );

export const AlertCircle = (p) =>
  baseSvg(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>,
    p
  );

export const Activity = (p) =>
  baseSvg(
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    p
  );

export const Radio = (p) =>
  baseSvg(
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </>,
    p
  );

export const FileCode = (p) =>
  baseSvg(
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </>,
    p
  );

export const FileText = (p) =>
  baseSvg(
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </>,
    p
  );

export const Check = (p) =>
  baseSvg(
    <polyline points="20 6 9 17 4 12" />,
    p
  );

export const CheckCircle = (p) =>
  baseSvg(
    <>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>,
    p
  );

export const CheckCircle2 = CheckCircle;

export const Copy = (p) =>
  baseSvg(
    <>
      <rect x="9" y="9" width="13" height="13" rx="1" ry="1" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>,
    p
  );

export const Search = (p) =>
  baseSvg(
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>,
    p
  );

export const SearchCode = (p) =>
  baseSvg(
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <polyline points="9 10 7 11 9 12" />
      <polyline points="13 10 15 11 13 12" />
    </>,
    p
  );

export const Filter = (p) =>
  baseSvg(
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    p
  );

export const ArrowRight = (p) =>
  baseSvg(
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>,
    p
  );

export const ArrowUpRight = (p) =>
  baseSvg(
    <>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </>,
    p
  );

export const ChevronRight = (p) =>
  baseSvg(
    <polyline points="9 18 15 12 9 6" />,
    p
  );

export const ChevronLeft = (p) =>
  baseSvg(
    <polyline points="15 18 9 12 15 6" />,
    p
  );

export const ChevronDown = (p) =>
  baseSvg(
    <polyline points="6 9 12 15 18 9" />,
    p
  );

export const LayoutDashboard = (p) =>
  baseSvg(
    <>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </>,
    p
  );

export const Gauge = (p) =>
  baseSvg(
    <>
      <path d="M12 14l3-3" />
      <path d="M3.34 19a10 10 0 1117.32 0" />
    </>,
    p
  );

export const Bell = (p) =>
  baseSvg(
    <>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </>,
    p
  );

export const Database = (p) =>
  baseSvg(
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </>,
    p
  );

export const Sliders = (p) =>
  baseSvg(
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>,
    p
  );

export const Server = (p) =>
  baseSvg(
    <>
      <rect x="2" y="2" width="20" height="8" rx="1" ry="1" />
      <rect x="2" y="14" width="20" height="8" rx="1" ry="1" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </>,
    p
  );

export const Layers = (p) =>
  baseSvg(
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>,
    p
  );

export const Terminal = (p) =>
  baseSvg(
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>,
    p
  );

export const Menu = (p) =>
  baseSvg(
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>,
    p
  );

export const X = (p) =>
  baseSvg(
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>,
    p
  );

export const Eye = (p) =>
  baseSvg(
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    p
  );

export const Send = (p) =>
  baseSvg(
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>,
    p
  );

export const Mail = (p) =>
  baseSvg(
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>,
    p
  );

export const ExternalLink = (p) =>
  baseSvg(
    <>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>,
    p
  );

export const Play = (p) =>
  baseSvg(
    <polygon points="5 3 19 12 5 21 5 3" />,
    p
  );

export const Upload = (p) =>
  baseSvg(
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </>,
    p
  );

export const Cpu = (p) =>
  baseSvg(
    <>
      <rect x="4" y="4" width="16" height="16" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </>,
    p
  );

export const Binary = (p) =>
  baseSvg(
    <>
      <rect x="4" y="4" width="4" height="6" />
      <rect x="16" y="4" width="4" height="6" />
      <rect x="4" y="14" width="4" height="6" />
      <rect x="16" y="14" width="4" height="6" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </>,
    p
  );

export const Inbox = (p) =>
  baseSvg(
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </>,
    p
  );

export const Plus = (p) =>
  baseSvg(
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>,
    p
  );

export const ArrowUpDown = (p) =>
  baseSvg(
    <>
      <polyline points="7 15 12 20 17 15" />
      <polyline points="7 9 12 4 17 9" />
    </>,
    p
  );

export const Code2 = (p) =>
  baseSvg(
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>,
    p
  );

export const ArrowLeft = (p) =>
  baseSvg(
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>,
    p
  );

export const EyeOff = (p) =>
  baseSvg(
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>,
    p
  );

export const Lock = (p) =>
  baseSvg(
    <>
      <rect x="3" y="11" width="18" height="11" rx="1" ry="1" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>,
    p
  );

export const User = (p) =>
  baseSvg(
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>,
    p
  );

export const LogOut = (p) =>
  baseSvg(
    <>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
    p
  );

