import { useId } from 'react';
import type { School } from './schools';
import type { TripStatus } from '@dd/domain';
import { Icon } from './Icon';

const route = 'M155 380 L255 347 Q280 340 290 312 L333 205 Q340 184 366 180 L520 140';
const streets = [
  'M-40 210Q150 270 310 180T850 90',
  'M-40 240Q150 300 310 210T850 120',
  'M-30 470Q230 385 420 395T850 270',
  'M-30 495Q230 410 420 420T850 295',
  'M120-30Q225 160 125 330T70 590',
  'M150-30Q255 160 155 330T100 590',
  'M395-40Q440 140 350 295T375 600',
  'M420-40Q465 140 375 295T400 600',
  'M620-30Q530 180 665 330T690 590',
  'M660-30Q570 180 705 330T730 590',
];
export function IllustratedCampusMap({ school, status }: { school: School; status?: TripStatus }) {
  const id = useId().replace(/:/g,'');
  const tracking = status === 'confirmed' || status === 'arriving' || status === 'in_progress';
  return <div className={`campus-map navigation-map ${tracking ? 'tracking' : ''}`} data-testid="campus-map">
    <div className="map-top"><span className="map-label"><Icon name="navigation"/>{tracking ? 'SIMULATED TRIP TRACKING' : 'YOUR CAMPUS, CONNECTED'}</span><span className="map-compass"><Icon name="navigation"/>N</span></div>
    <svg className="navigation-scene" viewBox="0 0 800 540" role="img" aria-label={`Illustrated ${school.town} campus map. ${tracking ? 'Simulated driver and rider positions, not live GPS.' : 'No person location is being shared.'}`}>
      <defs>
        <radialGradient id={`${id}-ambient`}><stop stopColor="var(--liquid-green)" stopOpacity=".2"/><stop offset="1" stopColor="var(--liquid-deep)" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-route`} x1="155" y1="380" x2="520" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="var(--liquid-glow)" stopOpacity=".65"/><stop offset="1" stopColor="#edfffa"/></linearGradient>
        <pattern id={`${id}-grid`} width="38" height="38" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#cae5ef" opacity=".11"/></pattern>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <rect width="800" height="540" fill={`url(#${id}-ambient)`}/><rect width="800" height="540" fill={`url(#${id}-grid)`}/>
      <g className="map-contours" fill="none"><path d="M-90 390C70 115 270 450 485 200S730 35 890 110"/><path d="M-90 410C70 135 270 470 485 220S730 55 890 130"/><path d="M-90 430C70 155 270 490 485 240S730 75 890 150"/></g>
      <g className="map-streets" fill="none">{streets.map(d => <path key={d} d={d}/>)}</g>
      <g className="map-district"><text x="70" y="125">CAMPUS NORTH</text><text x="535" y="432">{school.town.toUpperCase()}</text><text x="355" y="505">CAMPUS SOUTH</text></g>
      <path className="navigation-glow" d={route} filter={`url(#${id}-glow)`}/>
      <path className="navigation-route" d={route} stroke={`url(#${id}-route)`}/>
      <path className="map-route navigation-trace" d={route}/>
      <g className="campus-node" transform="translate(278 225)"><circle r="29"/><circle r="35" className="node-outline"/><text y="5" textAnchor="middle">{school.short}</text><text y="54" className="node-caption" textAnchor="middle">CAMPUS</text></g>
      <g className="destination-node" transform="translate(520 140)"><circle r="23"/><circle r="8"/><path d="M-4 0h8M0-4v8"/><text x="0" y="-38" textAnchor="middle">Drop-off</text><text x="0" y="43" textAnchor="middle" className="map-place-label">{school.town} downtown</text></g>
      {tracking ? <>
        <g data-testid="rider-marker" className={status === 'in_progress' ? 'rider-travelling' : ''}><g transform="translate(155 380)"><circle className="map-pulse" r="28" fill="var(--liquid-glow)" opacity=".14"/><circle className="rider-core" r="10"/><text className="rider-label" x="0" y="42" textAnchor="middle">{status === 'in_progress' ? 'Riding together' : 'Rider · pickup'}</text></g></g>
        <g data-testid="driver-marker" className={`car-marker car-${status}`}><g transform="translate(155 380)"><circle className="driver-halo" r="30"/><rect className="driver-shell" x="-22" y="-18" width="44" height="36" rx="14"/><path className="driver-glyph" d="M-11 3V-4L-7-10H7L11-4V3H-11ZM-11-3H11M-7 6V9M7 6V9M-7 0H-5M5 0H7"/></g></g>
      </> : <g className="pickup-node" transform="translate(155 380)"><circle r="22"/><circle r="6"/><text x="0" y="43" textAnchor="middle">Pickup</text><text className="map-place-label" x="0" y="62" textAnchor="middle">{school.landmark}</text></g>}
    </svg>
    <div className="map-legend"><span><i className="legend-pickup"/>Pickup</span><span><i className="legend-route"/>Route</span><span><i className="legend-dropoff"/>Drop-off</span></div>
    <div className="map-bottom"><span><i className={tracking ? 'live-dot' : 'static-dot'}/>{tracking ? 'Sharing during this simulated ride only' : 'Illustrated map · No live location sharing'}</span><span>DEMO</span></div>
  </div>;
}
