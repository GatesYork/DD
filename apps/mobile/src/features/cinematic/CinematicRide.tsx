import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEMO_DRIVERS, INITIAL_STATE, demoReducer, money, priceBreakdown, type DemoState, type DemoAction } from '@dd/domain';
import { dollarsToCents, validationMessage } from '@dd/validation';
import { LiquidBackground } from './LiquidBackground';
import { CampusMap } from './CampusMap';
import { CampusEmblem } from './CampusEmblem';
import { Icon } from './Icon';
import { schools, type School } from './schools';
import { playFeedback } from './sound';
import './cinematic.css';
import './liquid-theme.css';
import './navigation-theme.css';

function SchoolLogo({ school }: { school: School }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [school.id]);
  return school.logo && !failed ? <img className="school-logo" src={school.logo} alt={`${school.name} logo`} onError={() => setFailed(true)} /> : <span className="school-monogram" title="Temporary school monogram; official logo pending">{school.short}</span>;
}
const labels = { confirmed: 'Your people. Your ride.', arriving: 'Meet at your pickup.', in_progress: 'Enjoy the ride.', completed: 'Home looks good on you.', cancelled: 'Another time, then.' };
const nextLabels = { confirmed: 'Simulate driver arrival', arriving: 'Simulate starting ride', in_progress: 'Simulate completing ride' };

export default function CinematicRide() {
  const [school, setSchool] = useState<School>(schools[0]);
  const [schoolMenu, setSchoolMenu] = useState(false);
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const [mode, setMode] = useState<'rider' | 'driver'>('rider');
  const [pickup, setPickup] = useState<string>(schools[0].landmark);
  const [destination, setDestination] = useState<string>(schools[0].destination);
  const [route, setRoute] = useState(0);
  const [passengers, setPassengers] = useState(1);
  const [sound, setSound] = useState(false);
  const [motion, setMotion] = useState(true);
  const [systemReduced, setSystemReduced] = useState(false);
  const [online, setOnline] = useState(false);
  const [minimum, setMinimum] = useState('4');
  const [browse, setBrowse] = useState(false);
  const [preferred, setPreferred] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(120);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [welcome, setWelcome] = useState(true);
  const scene = useRef<HTMLDivElement>(null);
  const autoMatch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = systemReduced || !motion;
  const trip = state.trip;
  const finished = trip?.status === 'completed' || trip?.status === 'cancelled';
  const activeTrip = !!trip && !finished;
  const perPerson = (4 + route) * 100;
  const quote = priceBreakdown(perPerson, 1500, passengers);
  const distances = ['1.2', '2.8', '4.6'];
  const durations = ['6', '11', '17'];
  const eligible = DEMO_DRIVERS.filter(d => d.seats >= passengers && (d.id !== 'avery' || online));
  const style = { '--primary': school.color, '--accent': school.accent, '--wash': school.wash, '--liquid-deep': school.liquid[0], '--liquid-blue': school.liquid[1], '--liquid-green': school.liquid[2], '--liquid-glow': school.liquid[3] } as CSSProperties;

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReduced(q.matches); sync(); q.addEventListener('change', sync);
    const saved = localStorage.getItem('dd-school');
    const selected = schools.find(s => s.id === saved);
    if (selected) { setSchool(selected); setPickup(selected.landmark); setDestination(selected.destination); }
    return () => q.removeEventListener('change', sync);
  }, []);
  useEffect(() => { const timer = setTimeout(() => setWelcome(false), reduced ? 0 : 1100); return () => clearTimeout(timer); }, [reduced]);
  useEffect(() => {
    if (!waiting || !deadline) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) { setPreferred(null); setDeadline(null); }
    };
    tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer);
  }, [waiting, deadline]);
  useEffect(() => {
    if (!waiting || preferred || mode === 'driver' || state.trip) return;
    const available = state.offers.find(o => o.driver.id !== 'avery' && o.driver.seats >= passengers);
    if (!available) return;
    autoMatch.current = setTimeout(() => {
      setState(current => {
        if (current.trip || !current.request) return current;
        try { return demoReducer(current, { type: 'accept', offerId: available.id, now: Date.now() }); }
        catch { return current; }
      });
      setWaiting(false); playFeedback(sound, true);
    }, reduced ? 350 : 2300);
    return () => { if (autoMatch.current) clearTimeout(autoMatch.current); };
  }, [waiting, preferred, mode, state.offers, state.trip, passengers, reduced, sound]);

  function feedback(success = false) { playFeedback(sound, success); }
  function act(action: DemoAction) {
    try { setState(demoReducer(state, action)); setError(''); feedback(action.type === 'advance' || action.type === 'accept'); }
    catch (e) { setError(validationMessage(e)); }
  }
  function selectSchool(next: School) {
    if (state.request || activeTrip) return;
    setSchool(next); setPickup(next.landmark); setDestination(next.destination); setRoute(0);
    setSchoolMenu(false); setPreferred(null); setBrowse(false); localStorage.setItem('dd-school', next.id); feedback();
  }
  function requestRide() {
    try {
      const next = demoReducer(state, { type: 'request', input: { pickup, destination, passengers }, fareCents: perPerson, now: Date.now() });
      if (preferred && !eligible.some(d => d.id === preferred)) throw new Error('That driver is offline or does not have enough seats. Choose another driver.');
      setState(next); setWaiting(true); setDeadline(preferred ? Date.now() + 120000 : null); setError(''); feedback();
    } catch (e) { setError(validationMessage(e)); }
  }
  function cancelSearch() { act({ type: 'cancel' }); setWaiting(false); setDeadline(null); }
  function acceptAsDriver(driverId: string) {
    if (driverId === 'avery') {
      if (!online) { setError('Start driving before accepting a request.'); return; }
      try { if (dollarsToCents(minimum) > quote.driverEarningsCents) throw new Error('This trip is below your private minimum earnings.'); }
      catch (e) { setError(validationMessage(e)); return; }
    }
    if (preferred && preferred !== driverId) { setError('This request is still reserved for the selected driver.'); return; }
    const offer = state.offers.find(o => o.driver.id === driverId);
    if (!offer) { setError('This vehicle does not have enough passenger seats.'); return; }
    act({ type: 'accept', offerId: offer.id, now: Date.now() }); setWaiting(false); setDeadline(null);
  }

  return <div className={`cinema ${reduced ? 'reduce-motion' : ''} ${activeTrip ? 'trip-live' : ''}`} style={style} ref={scene} onPointerMove={e => {
    if (reduced || e.pointerType !== 'mouse') return;
    scene.current?.style.setProperty('--mx', `${(e.clientX / innerWidth - .5) * 18}px`);
    scene.current?.style.setProperty('--my', `${(e.clientY / innerHeight - .5) * 14}px`);
  }} onPointerLeave={() => { scene.current?.style.setProperty('--mx', '0px'); scene.current?.style.setProperty('--my', '0px'); }}>
    <LiquidBackground palette={school.liquid} reduced={reduced}/>
    {welcome && !reduced && <div className="intro-film" aria-hidden="true"><span>dd<span className="intro-dot">.</span></span><p>GOOD NIGHTS. GREAT COMPANY.</p></div>}
    <header className="topbar"><a className="wordmark" href="#" aria-label="Designated Driver home" onClick={e => e.preventDefault()}>dd<span>.</span><small>campus moves.</small></a>
      <div className="school-picker"><button className="school-trigger" aria-expanded={schoolMenu} onClick={() => { setSchoolMenu(!schoolMenu); feedback(); }}><SchoolLogo school={school}/><span>{school.name}<small>{school.town}, Georgia</small></span><Icon name="chevron"/></button>
        {schoolMenu && <div className="school-menu"><p>MAKE IT YOUR CAMPUS</p>{schools.map(s => <button key={s.id} disabled={!!state.request} onClick={() => selectSchool(s)}><SchoolLogo school={s}/><span>{s.name}<small>{s.town}</small></span>{school.id === s.id && <Icon name="check"/>}</button>)}<small>{state.request ? 'Finish your ride before changing campuses.' : 'Preview campuses · Some badges are temporary monograms.'}</small></div>}
      </div>
      <div className="header-tools"><button className={`tool ${sound ? 'enabled' : ''}`} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound} title="Web sound is opt-in and may play in silent mode. Native silent-switch support is not connected." onClick={() => { setSound(!sound); playFeedback(!sound); }}><Icon name={sound ? "sound" : "muted"}/><span>Sound {sound ? 'on' : 'off'}</span></button><button className="tool" aria-label="Toggle motion" aria-pressed={motion && !systemReduced} onClick={() => setMotion(!motion)}><Icon name="motion"/><span>Motion {reduced ? 'off' : 'on'}</span></button><span className="user-avatar">YOU</span></div>
    </header>
    <main>
      <div className="eyeline"><span><i className="live-dot"/> {school.mascot}</span><span>THE NIGHT IS YOURS. GET THERE TOGETHER.</span><span>01 / CAMPUS EDITION</span></div>
      <section className="hero"><div><div className="hero-kicker">LESS PLANNING. MORE LIVING.</div><h1 key={school.id}>Your campus.<br/><span className="serif">In good company.</span></h1><p>From the first plan to the last ride home.<br/>Student rides, with a little more school spirit.</p></div><CampusEmblem school={school}/></section>
      <section className="ride-studio">
        <div className="map-column"><div className="map-heading"><span className="section-label">A LITTLE CLOSER TO YOUR PEOPLE</span><span className="pill">{school.town} <Icon name="diagonal"/></span></div><CampusMap school={school} status={trip?.status}/><div className="campus-strip"><SchoolLogo school={school}/><div><strong>{school.name}</strong><small>Your school. Your colors. Your way home.</small></div><Icon name="orbit" className="strip-orbit"/></div><div className="map-footnote">Fictional rides and preset fares. Typed addresses do not yet calculate routes or distance.</div></div>
        <div className="booking-shell"><div className="mode-switch"><button aria-label="Ride mode" aria-pressed={mode === 'rider'} className={mode === 'rider' ? 'selected' : ''} onClick={() => { setMode('rider'); setError(''); feedback(); }}>Get a ride <Icon name="diagonal"/></button><button aria-label="Drive mode" aria-pressed={mode === 'driver'} className={mode === 'driver' ? 'selected' : ''} onClick={() => { setMode('driver'); setError(''); feedback(); }}>Be the ride <Icon name="arrow"/></button></div>
        <div className="booking-content" key={`${school.id}-${mode}-${trip?.status ?? (waiting ? 'waiting' : browse ? 'browse' : 'request')}`}>
        {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
        {trip ? <>
          <div className="section-label">{finished ? 'THE END OF A GOOD CHAPTER' : 'SIMULATED RIDE · YOU’RE MATCHED'}</div><h2>{labels[trip.status]}</h2>
          <div className="driver-identity"><div className="portrait">{trip.offer.driver.initials}</div><div><strong>{trip.offer.driver.name}</strong><small>{school.name} · <Icon name="star"/> {trip.offer.driver.rating}</small><small>{trip.offer.driver.car}</small></div><span className="verified-mark"><Icon name="check"/></span></div>
          <div className="trip-stages">{['Matched', 'Pickup', 'Riding', 'Arrived'].map((s, i) => <span key={s} className={i <= ['confirmed','arriving','in_progress','completed'].indexOf(trip.status) ? 'done' : ''}><i/>{s}</span>)}</div>
          <div className="receipt"><div><span>{money(trip.offer.perPersonCents)} × {trip.request.passengers} passenger{trip.request.passengers > 1 ? 's' : ''}</span><strong>{money(trip.offer.totalCents)}</strong></div><small>Your total is locked. No added platform fee.</small>{mode === 'driver' && <><div><span>Platform commission · 15%</span><span>−{money(trip.offer.feeCents)}</span></div><div><strong>Your earnings</strong><strong>{money(trip.offer.driverEarningsCents)}</strong></div><small>Before any other applicable deductions.</small></>}</div>
          {!finished && <><button className="primary-button" onClick={() => act({ type: 'advance' })}>{nextLabels[trip.status as keyof typeof nextLabels]} <Icon name="arrow"/></button>{trip.status !== 'in_progress' && <button className="text-button" onClick={() => act({ type: 'cancel' })}>Cancel ride</button>}</>}
          {trip.status === 'completed' && <div className="rating"><p>Good company deserves a good rating.</p>{[1,2,3,4,5].map(n => <button key={n} aria-label={`Rate ${n} stars`} className={n <= (state.rating ?? 0) ? 'rated' : ''} onClick={() => act({ type: 'rate', score: n })}><Icon name="star" filled={n <= (state.rating ?? 0)}/></button>)}{state.rating && <small>Thanks! Your demo rating is {state.rating}/5.</small>}</div>}
          <button className="secondary-button" onClick={() => act({ type: 'favorite', driverId: trip.offer.driver.id })}><Icon name="heart" filled={state.favorites.includes(trip.offer.driver.id)}/>{state.favorites.includes(trip.offer.driver.id) ? " Favorite driver saved" : " Save favorite driver"}</button>
          {finished && <button className="primary-button" onClick={() => { act({ type: 'reset' }); setPreferred(null); setWaiting(false); setBrowse(false); }}>Request another ride <Icon name="diagonal"/></button>}
          <p className="fine-print">{finished ? 'Location sharing has ended.' : 'Simulated location sharing runs from matching through drop-off.'} No payments are collected.</p>
        </> : mode === 'driver' ? <>
          <span className="section-label">DRIVER STUDIO · AVERY M.</span><h2>Your time.<br/><em>Your kind of drive.</em></h2><div className={`availability ${online ? 'is-online' : ''}`}><span><i className={online ? 'live-dot' : 'static-dot'}/>{online ? 'You’re online' : 'You’re off the clock'}</span><button onClick={() => { setOnline(!online); feedback(); }}>{online ? 'Stop driving' : 'Start driving'}</button></div>
          <label className="input-label">Private minimum earnings per trip<div className="input-wrap"><span>$</span><input aria-label="Minimum earnings in whole dollars" inputMode="numeric" value={minimum} onChange={e => setMinimum(e.target.value)}/></div></label><p className="fine-print">Whole dollars only. This preference is private; riders cannot see or compare it.</p>
          {state.request ? <><div className="receipt"><strong>{state.request.pickup} <Icon name="arrow"/> {state.request.destination}</strong><p>{distances[route]} mi · {durations[route]} min · {passengers} passengers · Illustrated route</p><div><span>Rider total</span><strong>{money(quote.totalCents)}</strong></div><div><span>Platform commission · 15%</span><span>−{money(quote.feeCents)}</span></div><div><strong>Your earnings</strong><strong>{money(quote.driverEarningsCents)}</strong></div></div><button className="primary-button" onClick={() => acceptAsDriver('avery')}>Accept this ride <Icon name="arrow"/></button></> : <div className="driver-empty"><span><Icon name="car"/></span><strong>{online ? 'Ready for your next good turn.' : 'A little freedom. A little extra.'}</strong><p>Go to Get a ride and post a demo request. Return here to see the route, earnings, and accept it.</p></div>}
        </> : waiting ? <>
          <span className="section-label">{preferred ? 'YOUR FIRST CHOICE GETS FIRST CALL' : 'GOOD COMPANY IS ON THE WAY'}</span><div className="search-visual"><div/><div/><Icon name="diagonal"/></div><h2>{preferred ? 'A familiar face.' : 'Finding your people.'}</h2><p className="subcopy">{preferred ? 'Your selected driver has a private window to accept. Then we’ll open your request to others.' : 'The first eligible driver to accept gets your ride. No bidding. No changing your price.'}</p>
          {preferred && <><div className="countdown" role="timer">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2,'0')}</div><button className="primary-button" onClick={() => acceptAsDriver(preferred)}>Simulate driver acceptance <Icon name="arrow"/></button><button className="secondary-button" onClick={() => { setPreferred(null); setDeadline(null); feedback(); }}>Find other drivers now</button></>}
          <div className="receipt"><div><span>{money(perPerson)} × {passengers} passengers</span><strong>{money(quote.totalCents)}</strong></div><small>Locked total · Simulated matching</small></div><button className="text-button" onClick={cancelSearch}>Cancel request</button>
        </> : browse ? <>
          <span className="section-label">FAMILIAR FACES. NEW FRIENDS.</span><h2>Meet your people.</h2><p className="subcopy">Pick an active driver for a two-minute first chance. Prices stay tied to your route, not a bidding war.</p>
          {eligible.map(d => <div className="profile-card" key={d.id}><div className="driver-identity"><div className="portrait">{d.initials}</div><div><strong>{d.name} {state.favorites.includes(d.id) && <Icon name="heart" filled/>}</strong><small>{school.name} · <Icon name="star"/> {d.rating}</small><small>{d.car} · {d.seats} seats</small></div><span className="online-label"><i className="live-dot"/>{d.minutes} min*</span></div><button className="secondary-button" onClick={() => { setPreferred(d.id); setBrowse(false); feedback(); }}>Request {d.name}</button></div>)}<p className="fine-print">*Fictional arrival estimates and profiles. Only active drivers with enough seats appear.</p><button className="text-button" onClick={() => { setBrowse(false); feedback(); }}>Back to your ride</button>
        </> : <>
          <div className="section-label">YOUR NEXT GOOD NIGHT STARTS HERE</div><h2>Where to,<br/><em>{school.short === 'GC' ? 'Bobcat' : school.short === 'UGA' ? 'Bulldog' : school.short === 'GT' ? 'Yellow Jacket' : 'Owl'}?</em><Icon name="diagonal" className="title-arrow"/></h2>
          <div className="location-inputs"><label><span className="pickup-dot"/><input aria-label="Pickup" value={pickup} onChange={e => setPickup(e.target.value)} placeholder="Where should we meet?"/></label><div className="location-connector"/><label><span className="destination-dot"/><input aria-label="Destination" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Where are you headed?"/></label></div>
          <div className="route-options" aria-label="Demo route distance">{['Campus hop', 'Across town', 'Longer ride'].map((label, i) => <button key={label} aria-pressed={route === i} className={route === i ? 'chosen' : ''} onClick={() => { setRoute(i); feedback(); }}>{label}<small>{distances[i]} mi*</small></button>)}</div>
          <div className="passenger-label"><span>Who’s coming?</span><small>Same price for each person</small></div><div className="passenger-pills">{[1,2,3,4,5,6].map(n => <button key={n} aria-label={`${n} passenger${n > 1 ? 's' : ''}`} aria-pressed={passengers === n} className={passengers === n ? 'chosen' : ''} onClick={() => { setPassengers(n); if (preferred && !DEMO_DRIVERS.some(d => d.id === preferred && d.seats >= n)) setPreferred(null); feedback(); }}>{n}<span>{n === 1 ? 'solo' : 'people'}</span></button>)}</div>
          <div className="fare-preview" key={`${route}-${passengers}`}><div><strong>${perPerson / 100}<small> / person</small></strong><span>{durations[route]} min · {distances[route]} mi · Demo estimate</span></div><div><span>YOUR TOTAL</span><b>{money(quote.totalCents)}</b></div></div>
          {preferred && <div className="preferred-banner"><Icon name="heart"/> First call: {DEMO_DRIVERS.find(d => d.id === preferred)?.name}<button aria-label="Remove preferred driver" onClick={() => setPreferred(null)}><Icon name="close"/></button></div>}
          <button className="primary-button" onClick={requestRide}>Find a ride <Icon name="diagonal"/></button><button className="browse-button" onClick={() => { setBrowse(true); feedback(); }}>Or find a familiar face <span>Meet the drivers <Icon name="arrow"/></span></button><p className="fine-print">No added rider fee. Drivers keep 85% before other applicable deductions. *Preset demo routes; typed addresses do not calculate real distance.</p>
        </>}
        </div></div>
      </section>
      <section className="bottom-band"><span>GOOD NIGHTS.</span><span className="band-star"><Icon name="orbit"/></span><span>GREAT COMPANY.</span><span className="band-star"><Icon name="orbit"/></span><span>YOUR CAMPUS.</span><span className="band-star"><Icon name="orbit"/></span></section>
      <footer><span><b>dd.</b> A little school spirit. A better way home.</span><span>INTERACTIVE DEMO · NO REAL RIDES OR PAYMENTS</span></footer>
    </main>
  </div>;
}
