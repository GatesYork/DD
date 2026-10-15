import type { CSSProperties } from 'react';

const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  diagonal: 'M6 18 18 6M6 6h12v12',
  chevron: 'm6 9 6 6 6-6',
  sound: 'M4 9h4l5-4v14l-5-4H4V9m12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'M4 9h4l5-4v14l-5-4H4V9m13 0 5 6m0-6-5 6',
  motion: 'M3 12c3-10 6 10 9 0s6 10 9 0M3 5h4m10 14h4',
  heart: 'M12 20 4.4 12.6C-.5 7.8 6 1 12 7c6-6 12.5.8 7.6 5.6L12 20Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  navigation: 'm12 3 7 18-7-4-7 4L12 3Z',
  orbit: 'M20 12a8 8 0 1 1-8-8m-4 8a4 4 0 1 0 4-4m3-5h6v6m0-6-7 7',
  car: 'M4 16V9l3-5h10l3 5v7H4Zm0-6h16M7 13h1m8 0h1M6 16v3m12-3v3',
} as const;
export function Icon({ name, className = '', filled = false, style }: { name: keyof typeof paths; className?: string; filled?: boolean; style?: CSSProperties }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]}/></svg>;
}
