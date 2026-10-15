import type { School } from './schools';
import type { TripStatus } from '@dd/domain';
export function CampusMap({ school, status }: { school: School; status?: TripStatus }) {
  const tracking = status === 'confirmed' || status === 'arriving' || status === 'in_progress';
  return <div className={`campus-map ${tracking ? 'tracking' : ''}`} data-testid="campus-map">
    <div className="map-top"><span className="map-label">{tracking ? 'SIMULATED TRIP TRACKING' : 'YOUR CAMPUS, IN MOTION'}</span><span className="map-compass">N ↑</span></div>
    <svg viewBox="0 0 800 540" role="img" aria-label={`Illustrated ${school.town} campus map. ${tracking ? 'Simulated driver and rider positions, not live GPS.' : 'No person location is being shared.'}`}>
      <defs><pattern id="blocks" width="155" height="115" patternTransform="rotate(-18)" patternUnits="userSpaceOnUse"><rect x="9" y="9" width="131" height="91" rx="18" fill="var(--wash)"/><path d="M155 0H0V115" fill="none" stroke="white" strokeWidth="13"/></pattern><filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity=".12"/></filter></defs>
      <rect width="800" height="540" fill="#f7faf8"/><rect width="800" height="540" fill="url(#blocks)"/>
      <path d="M620 -40 Q480 190 665 330 T680 600" fill="none" stroke="#cce6e5" strokeWidth="65"/>
      <path d="M-40 420 Q210 520 300 310 T550 -20" fill="none" stroke="#d6e6cf" strokeWidth="75"/>
      <g fill="white" stroke="#d2dbdb" strokeWidth="2" transform="rotate(-18 310 250)"><rect x="220" y="165" width="135" height="90" rx="12"/><rect x="125" y="170" width="65" height="70" rx="8"/><rect x="390" y="310" width="130" height="70" rx="10"/><rect x="460" y="115" width="86" height="115" rx="12"/></g>
      <path className="map-route-base" d="M155 380 L255 347 Q280 340 290 312 L333 205 Q340 184 366 180 L520 140"/>
      <path className="map-route" d="M155 380 L255 347 Q280 340 290 312 L333 205 Q340 184 366 180 L520 140"/>
      <g className="map-campus" transform="translate(250 225)"><rect x="-25" y="-28" width="110" height="58" rx="12" fill="white" filter="url(#shadow)"/><text x="30" y="-4" textAnchor="middle" fill="var(--primary)" fontSize="18" fontWeight="800">{school.short}</text><text x="30" y="15" textAnchor="middle" fill="#788083" fontSize="8" letterSpacing="2">CAMPUS</text></g>
      <g transform="translate(520 140)"><circle r="17" fill="var(--primary)" stroke="white" strokeWidth="5"/><text x="0" y="-29" textAnchor="middle" fill="var(--primary)" fontSize="13" fontWeight="700">{school.town} downtown</text></g>
      {tracking ? <>
        <g data-testid="rider-marker" className={status === 'in_progress' ? 'rider-travelling' : ''}><g transform="translate(155 380)"><circle className="map-pulse" r="28" fill="var(--primary)" opacity=".12"/><circle r="10" fill="var(--primary)" stroke="white" strokeWidth="4"/><text x="0" y="40" textAnchor="middle" fontSize="12" fill="var(--primary)" fontWeight="700">{status === 'in_progress' ? 'Riding together' : 'Rider · pickup'}</text></g></g>
        <g data-testid="driver-marker" className={`car-marker car-${status}`}><g transform="translate(155 380)"><rect x="-22" y="-17" width="44" height="34" rx="13" fill="var(--primary)" stroke="white" strokeWidth="3" filter="url(#shadow)"/><path d="M-11 2V-4L-7-9H7L11-4V2M-11 0H11M-8 3V6M8 3V6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></g></g>
      </> : <g transform="translate(155 380)"><circle r="9" fill="white" stroke="var(--primary)" strokeWidth="4"/><text x="0" y="32" textAnchor="middle" fontSize="12" fill="var(--primary)">{school.landmark}</text></g>}
      <text x="590" y="410" fill="#6c9795" fontSize="10" letterSpacing="4" transform="rotate(-65 590 410)">CAMPUS GREENWAY</text>
    </svg>
    <div className="map-bottom"><span><i className={tracking ? 'live-dot' : 'static-dot'}/>{tracking ? 'Sharing during this simulated ride only' : 'Illustrated map · No live location sharing'}</span><span>DEMO</span></div>
  </div>;
}
