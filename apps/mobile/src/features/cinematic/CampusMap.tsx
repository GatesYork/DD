import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import type { TripStatus } from '@dd/domain';
import type { School } from './schools';
import { IllustratedCampusMap } from './IllustratedCampusMap';
import { Icon } from './Icon';
import 'mapbox-gl/dist/mapbox-gl.css';
import './real-map.css';

// Expo substitutes this public value when Vercel builds the web bundle.
const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

// Never render raw SDK errors: their messages can contain request URLs and tokens.
function mapFailure(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
  if (status === 401) return 'Mapbox rejected the token (401). Copy the full public token into Vercel, save it, and redeploy.';
  if (status === 403) return 'Mapbox denied map access (403). Check the token’s allowed website URLs and permissions, and your Mapbox account access.';
  if (status === 429) return 'Mapbox’s request limit was reached (429). Check account usage and try again later.';
  if (status >= 500) return 'Mapbox is having a service problem. Please try again shortly.';
  if (status === 404) return 'Mapbox could not find the requested map resource (404). Please retry or report this error.';
  return 'The browser could not load Mapbox data. Check your connection and whether a browser extension or network filter is blocking Mapbox, then retry.';
}
export function CampusMap({ school, status }: { school: School; status?: TripStatus }) {
  if (!token) return <div><p className="map-config-note" role="status">Map preview · Street maps need a Mapbox token in the deployment.</p><IllustratedCampusMap school={school} status={status}/></div>;
  return <StreetMap key={school.id} school={school} status={status}/>;
}

function StreetMap({ school, status }: { school: School; status?: TripStatus }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const request = useRef(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Your location is not shared with anyone.');
  const [hasLocation, setHasLocation] = useState(false);
  const [retry, setRetry] = useState(0);

  function clearLocation() {
    request.current++;
    marker.current?.remove(); marker.current = null;
    setHasLocation(false); setLocating(false);
    setLocationMessage('Your location is not shared with anyone.');
  }
  useEffect(() => {
    if (status === 'completed' || status === 'cancelled') clearLocation();
  }, [status]);

  useEffect(() => {
    let disposed = false;
    let instance: MapboxMap | null = null;
    let observer: ResizeObserver | null = null;
    let failed = false;
    setReady(false); setError('');
    const timer = setTimeout(() => {
      if (!disposed) setError('The street map is taking too long to load. Check your connection and try again.');
    }, 15000);
    async function start() {
      try {
        if (!token?.startsWith('pk.')) throw new Error('public-token-required');
        const { default: mapboxgl } = await import('mapbox-gl');
        if (disposed || !container.current) return;
        instance = new mapboxgl.Map({
          container: container.current, accessToken: token,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [...school.center], zoom: 14.2, pitch: 0,
          attributionControl: true, cooperativeGestures: true,
        });
        map.current = instance;
        instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        instance.on('load', () => {
          if (disposed || !instance) return;
          clearTimeout(timer); setReady(true);
          if (!failed) setError('');
          const badge = document.createElement('div');
          badge.className = 'real-campus-pin';
          badge.textContent = school.short;
          badge.setAttribute('aria-label', `${school.name} campus area`);
          new mapboxgl.Marker({ element: badge }).setLngLat([...school.center]).addTo(instance);
        });
        instance.on('error', event => {
          if (disposed) return;
          failed = true; clearTimeout(timer);
          setError(mapFailure(event.error));
        });
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
      } catch {
        if (!disposed) { clearTimeout(timer); setError('Street maps are unavailable. Check that the deployment has a valid public Mapbox token and your browser supports WebGL.'); }
      }
    }
    void start();
    return () => {
      disposed = true; request.current++; clearTimeout(timer); observer?.disconnect();
      marker.current?.remove(); marker.current = null;
      instance?.remove(); map.current = null;
    };
  }, [school, retry]);

  function locate() {
    if (!map.current || !ready) return;
    if (!navigator.geolocation) { setLocationMessage('Location is unavailable in this browser. You can still explore the map.'); return; }
    const currentRequest = ++request.current;
    setLocating(true); setLocationMessage('Waiting for your location permission…');
    navigator.geolocation.getCurrentPosition(async position => {
      const { default: mapboxgl } = await import('mapbox-gl');
      if (currentRequest !== request.current || !map.current) return;
      const point: [number, number] = [position.coords.longitude, position.coords.latitude];
      marker.current?.remove();
      const dot = document.createElement('div');
      dot.className = 'real-location-pin'; dot.setAttribute('aria-label', 'Your current location');
      dot.dataset.testid = 'current-location-marker';
      marker.current = new mapboxgl.Marker({ element: dot }).setLngLat(point).addTo(map.current);
      map.current.jumpTo({ center: point, zoom: 15 });
      setHasLocation(true); setLocating(false);
      setLocationMessage(`Your location snapshot · accuracy about ${Math.round(position.coords.accuracy)} m. Not shared with another user.`);
    }, failure => {
      if (currentRequest !== request.current) return;
      setLocating(false);
      setLocationMessage(failure.code === 1 ? 'Location permission was denied. Allow location in your browser settings to try again.' : 'Could not get your location. Check device location services and try again.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  return <div className="real-campus-map" data-testid="campus-map">
    <div className="real-map-heading"><span><Icon name="navigation"/> {school.town} · Street map</span><button disabled={!ready} onClick={() => map.current?.jumpTo({ center: [...school.center], zoom: 14.2 })}>Back to campus</button></div>
    <div className="real-map-stage"><div className="real-map-canvas" ref={container} aria-label={`Interactive street map of ${school.name}`} data-testid="street-map"/>
      {!ready && !error && <div className="real-map-message" role="status">Loading campus streets…</div>}
      {error && <div className="real-map-message" role="alert"><p>{error}</p><button onClick={() => { clearLocation(); setRetry(n => n + 1); }}>Retry map</button></div>}
    </div>
    <div className="real-map-actions"><button disabled={!ready || locating} onClick={locate}><Icon name="navigation"/>{locating ? 'Locating…' : 'Use my location'}</button>{hasLocation && <button onClick={clearLocation}>Clear my location</button>}</div>
    <p className="real-map-status" role="status">{locationMessage}</p>
    <div className="real-map-footer">Real streets · Ride matching is still a demo. Live driver tracking and address-based routing are not connected yet.</div>
  </div>;
}
