import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEMO_DRIVERS, INITIAL_STATE, demoReducer, money, priceBreakdown, type DemoAction, type DemoState } from '@dd/domain';
import { dollarsToCents, validationMessage } from '@dd/validation';
import { colors as c } from '../../theme';

function Button({ label, onPress, secondary = false, testID }: { label: string; onPress: () => void; secondary?: boolean; testID?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} testID={testID} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, pressed && { opacity: 0.75 }]}><Text style={[s.buttonText, secondary && { color: c.ink }]}>{label}</Text></Pressable>;
}
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted} style={s.input} /></View>;
}

export default function RideExperience() {
  const wide = useWindowDimensions().width > 900;
  const [mode, setMode] = useState<'rider' | 'driver'>('rider');
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const [pickup, setPickup] = useState('Georgia College · Front Campus');
  const [destination, setDestination] = useState('Downtown Milledgeville');
  const [passengers, setPassengers] = useState(1);
  const [fare, setFare] = useState('7.00');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  function act(action: DemoAction) {
    try { setState(demoReducer(state, action)); setError(''); setNotice(''); }
    catch (e) { setError(validationMessage(e)); }
  }
  const trip = state.trip;
  const finished = trip?.status === 'completed' || trip?.status === 'cancelled';
  const stageLabels = { confirmed: 'Your ride is confirmed', arriving: 'Your driver has arrived', in_progress: 'On your way', completed: 'You’ve arrived. Nice ride.', cancelled: 'Ride cancelled' };
  const actionLabels = { confirmed: 'Simulate driver arrival', arriving: 'Simulate starting ride', in_progress: 'Simulate completing ride' };
  const offers = state.offers.filter(o => !favoritesOnly || state.favorites.includes(o.driver.id));
  let quote: ReturnType<typeof priceBreakdown> | null = null;
  try { quote = priceBreakdown(dollarsToCents(fare)); } catch { /* Validation is shown when the offer is submitted. */ }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.nav}>
      <View style={s.brand}><View style={s.logo}><Text style={s.logoText}>dd.</Text></View><View><Text style={s.brandName}>designated driver</Text><Text style={s.small}>Good company. A ride home.</Text></View></View>
      <View style={s.toggle}>{(['rider', 'driver'] as const).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: mode === item }} accessibilityLabel={item === 'rider' ? 'Ride mode' : 'Drive mode'} onPress={() => { setMode(item); setError(''); setNotice(''); }} style={[s.toggleItem, mode === item && s.toggleActive]}><Text style={[s.toggleText, mode === item && { color: c.white }]}>{item === 'rider' ? 'Ride' : 'Drive'}</Text></Pressable>)}</View>
    </View>
    <View style={s.demoBanner}><Text style={s.demoText}>INTERACTIVE DEMO · Fictional students and rides. No payments or live location. Changes reset on refresh.</Text></View>
    <View style={[s.layout, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
      {wide && <View style={[s.intro, { flex: 0.9 }]}>
        <View style={s.pill}><Text style={s.pillText}>●  GEORGIA COLLEGE · PILOT</Text></View>
        <Text role="heading" style={[s.title, !wide && { fontSize: 43 }]}>{mode === 'rider' ? 'Your campus.\nYour people.\nYour ride home.' : 'Your car.\nYour campus.\nYour price.'}</Text>
        <Text style={s.description}>{mode === 'rider' ? 'Find a ride with another student. See the price, choose your driver, and get where you’re going.' : 'Help another student get where they’re going. Choose a request and offer a price that works for you.'}</Text>
        <View style={s.routeCard}>
          <Text style={s.eyebrow}>AROUND THE NEIGHBORHOOD</Text>
          <View style={s.routeRow}><View style={s.routeDot} /><View style={{ flex: 1 }}><Text style={s.routeLabel}>{state.request?.pickup || pickup || 'Your pickup'}</Text><Text style={s.small}>Pickup</Text></View></View>
          <View style={s.routeLine} />
          <View style={s.routeRow}><View style={[s.routeDot, { backgroundColor: c.green }]} /><View style={{ flex: 1 }}><Text style={s.routeLabel}>{state.request?.destination || destination || 'Your destination'}</Text><Text style={s.small}>Destination</Text></View></View>
          <View style={s.routeFooter}><Text style={s.small}>Milledgeville, Georgia</Text><Text style={s.small}>Route illustration</Text></View>
        </View>
        <View style={s.benefits}><Text style={s.benefit}>01   Student community</Text><Text style={s.benefit}>02   Prices up front</Text><Text style={s.benefit}>03   Your choice of driver</Text></View>
      </View>}
      <View style={[s.card, wide && { flex: 1 }]}>
        {!!error && <View accessibilityRole="alert" style={s.error}><Text style={{ color: c.red }}>{error}</Text></View>}
        {!!notice && <View accessibilityLiveRegion="polite" style={s.notice}><Text style={{ color: c.ink }}>{notice}</Text></View>}
        {trip ? <>
          <Text style={s.eyebrow}>{trip.id} · SIMULATED TRIP</Text>
          <Text role="heading" style={s.cardTitle}>{stageLabels[trip.status]}</Text>
          <View style={s.person}><View style={s.avatar}><Text style={s.initials}>{trip.offer.driver.initials}</Text></View><View style={{ flex: 1 }}><Text style={s.name}>{trip.offer.driver.name}</Text><Text style={s.small}>{trip.offer.driver.car}</Text></View><Text style={s.price}>{money(trip.offer.totalCents)}</Text></View>
          <View style={s.receipt}><View style={s.between}><Text style={s.body}>Driver fare</Text><Text style={s.body}>{money(trip.offer.fareCents)}</Text></View><View style={s.between}><Text style={s.body}>Platform fee</Text><Text style={s.body}>{money(trip.offer.feeCents)}</Text></View><View style={s.between}><Text style={s.name}>Total · {trip.request.passengers} passenger{trip.request.passengers > 1 ? 's' : ''}</Text><Text style={s.name}>{money(trip.offer.totalCents)}</Text></View></View>
          <Text style={s.helper}>Demo checkout only. No card is collected and no money moves.</Text>
          {!finished && <><Button label={actionLabels[trip.status as keyof typeof actionLabels]} onPress={() => act({ type: 'advance' })} />{trip.status !== 'in_progress' && <Button secondary label="Cancel ride" onPress={() => act({ type: 'cancel' })} />}</>}
          {trip.status === 'completed' && <View style={s.rating}><Text style={s.name}>How was the ride?</Text><View style={s.ratingRow}>{[1, 2, 3, 4, 5].map(score => <Pressable key={score} accessibilityRole="button" accessibilityLabel={`Rate ${score} stars`} onPress={() => act({ type: 'rate', score })}><Text style={[s.star, { color: score <= (state.rating || 0) ? c.green : '#b7c3b3' }]}>★</Text></Pressable>)}</View>{state.rating && <Text style={s.small}>Thanks! Your demo rating is {state.rating}/5.</Text>}</View>}
          <Button secondary label={state.favorites.includes(trip.offer.driver.id) ? 'Remove favorite driver' : 'Save favorite driver'} onPress={() => act({ type: 'favorite', driverId: trip.offer.driver.id })} />
          {finished && <Button label="Request another ride" onPress={() => { act({ type: 'reset' }); setMode('rider'); setFavoritesOnly(false); }} />}
        </> : mode === 'driver' ? <>
          <Text style={s.eyebrow}>DRIVER VIEW · AVERY M.</Text><Text role="heading" style={s.cardTitle}>Make a little.\nHelp a lot.</Text><Text style={s.body}>This demo profile is approved for a vehicle with 4 passenger seats.</Text>
          {state.request ? <><View style={s.receipt}><Text style={s.name}>A student needs a ride</Text><Text style={s.body}>{state.request.pickup} → {state.request.destination}</Text><Text style={s.small}>{state.request.passengers} passenger{state.request.passengers > 1 ? 's' : ''} · Georgia College</Text></View><Field label="Your fare in dollars" value={fare} onChange={setFare} placeholder="7.00" /><Text style={s.helper}>{quote ? `Rider pays ${money(quote.totalCents)}, including a ${money(quote.feeCents)} platform fee. Driver fare: ${money(quote.fareCents)}, before any applicable deductions.` : 'Enter a fare between $1 and $200.'}</Text><Button label="Send my offer" onPress={() => { try { const next = demoReducer(state, { type: 'offer', driver: DEMO_DRIVERS[0], fareCents: dollarsToCents(fare), now: Date.now() }); setState(next); setError(''); setNotice('Offer sent. Switch to Ride to choose it.'); } catch (e) { setError(e instanceof Error ? e.message : 'Check your fare.'); } }} /></> : <View style={s.empty}><Text style={s.name}>Ready when your campus is.</Text><Text style={s.body}>Switch to Ride and create a request to try setting your own price.</Text><Button label="Try a rider request" onPress={() => setMode('rider')} /></View>}
        </> : !state.request ? <>
          <Text style={s.eyebrow}>LET’S GET YOU THERE</Text><Text role="heading" style={s.cardTitle}>Where are we headed?</Text><Text style={s.body}>A night out. A game day. A ride back.</Text>
          <View style={s.form}><Field label="Pickup" value={pickup} onChange={setPickup} /><Field label="Destination" value={destination} onChange={setDestination} />
            <Text style={s.label}>Passengers</Text><View style={s.passengerRow}>{[1, 2, 3, 4, 5, 6].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} passenger${n > 1 ? 's' : ''}`} accessibilityState={{ selected: passengers === n }} onPress={() => setPassengers(n)} style={[s.passenger, n === passengers && s.selectedPassenger]}><Text style={[s.name, n === passengers && { color: c.white }]}>{n}</Text></Pressable>)}</View>
          </View><Button label="Find a ride" onPress={() => act({ type: 'request', input: { pickup, destination, passengers }, now: Date.now() })} /><Text style={s.helper}>You’ll see the full booking price before choosing a driver. Demo offers expire after 5 minutes.</Text>
          <View style={s.bottomNote}><Text style={s.name}>Visiting a different campus?</Text><Text style={s.small}>One student community, wherever you go. More college towns are planned after the pilot.</Text></View>
        </> : <>
          <Text style={s.eyebrow}>YOUR RIDE, YOUR CHOICE</Text><Text role="heading" style={s.cardTitle}>Meet your ride.</Text><Text style={s.body}>Prices cover your whole booking for {state.request.passengers} passenger{state.request.passengers > 1 ? 's' : ''}.</Text>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: favoritesOnly }} onPress={() => setFavoritesOnly(!favoritesOnly)} style={s.filter}><Text style={s.label}>{favoritesOnly ? '☑' : '□'}  Favorite drivers only</Text></Pressable>
          {offers.length === 0 && <View style={s.empty}><Text style={s.body}>No favorite drivers match this request. Turn off the filter to see available offers.</Text></View>}
          {offers.map(offer => <View key={offer.id} style={s.offer}>
            <View style={s.person}><View style={s.avatar}><Text style={s.initials}>{offer.driver.initials}</Text></View><View style={{ flex: 1 }}><Text style={s.name}>{offer.driver.name}</Text><Text style={s.small}>★ {offer.driver.rating} · {offer.driver.minutes} min · Demo</Text></View><Text style={s.price}>{money(offer.totalCents)}</Text></View>
            <Text style={s.small}>{offer.driver.car} · {offer.driver.seats} seats</Text><Text style={s.helper}>{money(offer.fareCents)} fare + {money(offer.feeCents)} platform fee</Text>
            <Button label={`Choose ${offer.driver.name}`} onPress={() => act({ type: 'accept', offerId: offer.id, now: Date.now() })} />
          </View>)}<Button secondary label="Edit ride request" onPress={() => act({ type: 'cancel' })} />
        </>}
      </View>
    </View>
    <View style={s.footer}><Text style={s.small}>dd.   Built around campus life.</Text><Text style={s.small}>Pilot prototype · Not an operating ride service</Text></View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper }, page: { paddingHorizontal: 24, paddingVertical: 24, maxWidth: 1220, width: '100%', alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 25 }, brand: { flexDirection: 'row', gap: 12, alignItems: 'center' }, logo: { backgroundColor: c.green, width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, logoText: { color: c.lime, fontSize: 31, fontWeight: '800', letterSpacing: -3 }, brandName: { fontSize: 18, color: c.ink, fontWeight: '700', letterSpacing: -0.5 },
  toggle: { flexDirection: 'row', backgroundColor: '#e8ede2', padding: 4, borderRadius: 30 }, toggleItem: { paddingVertical: 11, paddingHorizontal: 24, borderRadius: 25 }, toggleActive: { backgroundColor: c.green }, toggleText: { color: c.ink, fontWeight: '600' },
  demoBanner: { backgroundColor: c.pale, padding: 12, borderRadius: 10, marginBottom: 40 }, demoText: { fontSize: 11, letterSpacing: 0.5, color: c.muted, lineHeight: 18 }, layout: { gap: 48 }, intro: { gap: 23 }, pill: { alignSelf: 'flex-start', backgroundColor: '#e9efdd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }, pillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: c.green }, title: { fontSize: 60, lineHeight: 65, fontWeight: '700', letterSpacing: -2.5, color: c.ink }, description: { color: c.muted, fontSize: 17, lineHeight: 27, maxWidth: 420 },
  routeCard: { backgroundColor: '#eaf0e1', borderRadius: 22, padding: 24, gap: 5 }, eyebrow: { color: c.muted, fontSize: 10, letterSpacing: 1.8, fontWeight: '700', marginBottom: 12 }, routeRow: { flexDirection: 'row', alignItems: 'center', gap: 15 }, routeDot: { width: 14, height: 14, backgroundColor: c.lime, borderWidth: 3, borderColor: c.green, borderRadius: 7 }, routeLine: { height: 28, borderLeftWidth: 2, borderColor: '#a9ba9d', marginLeft: 6 }, routeLabel: { color: c.ink, fontSize: 14, fontWeight: '600', marginBottom: 4 }, routeFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginTop: 20, borderTopWidth: 1, borderColor: '#d4dec9', paddingTop: 14 }, benefits: { gap: 12, paddingBottom: 8 }, benefit: { color: c.muted, fontSize: 12, letterSpacing: 0.4 },
  card: { backgroundColor: c.white, padding: 28, borderRadius: 26, borderWidth: 1, borderColor: c.border, gap: 12, minWidth: 0 }, cardTitle: { fontSize: 32, lineHeight: 39, fontWeight: '600', letterSpacing: -1.2, color: c.ink }, body: { color: c.muted, fontSize: 14, lineHeight: 23 }, small: { color: c.muted, fontSize: 11, lineHeight: 18 }, form: { gap: 18, marginVertical: 15 }, field: { gap: 8 }, label: { fontSize: 12, color: c.ink, fontWeight: '600' }, input: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 15, fontSize: 14, color: c.ink, backgroundColor: '#fbfcf9' }, passengerRow: { flexDirection: 'row', gap: 8 }, passenger: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 12, backgroundColor: c.paper, borderWidth: 1, borderColor: c.border }, selectedPassenger: { backgroundColor: c.green, borderColor: c.green }, button: { backgroundColor: c.green, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center' }, buttonText: { fontSize: 14, color: c.white, fontWeight: '600' }, secondary: { backgroundColor: c.pale }, helper: { fontSize: 11, color: c.muted, lineHeight: 18 }, bottomNote: { backgroundColor: c.paper, borderRadius: 14, padding: 16, gap: 8, marginTop: 10 }, person: { flexDirection: 'row', gap: 12, alignItems: 'center' }, avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#e6eddc', alignItems: 'center', justifyContent: 'center' }, initials: { color: c.green, fontWeight: '700', fontSize: 13 }, name: { color: c.ink, fontSize: 14, fontWeight: '600', lineHeight: 22 }, price: { fontSize: 23, color: c.ink, fontWeight: '700', letterSpacing: -0.7 }, offer: { borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 17, gap: 12 }, filter: { paddingVertical: 12 }, receipt: { gap: 12, padding: 18, backgroundColor: c.paper, borderRadius: 15, marginVertical: 8 }, between: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, error: { backgroundColor: '#fff0ed', borderRadius: 10, padding: 12 }, notice: { backgroundColor: c.pale, borderRadius: 10, padding: 12 }, empty: { paddingVertical: 22, gap: 16 }, rating: { gap: 8, paddingVertical: 15 }, ratingRow: { flexDirection: 'row', gap: 12 }, star: { fontSize: 35 }, footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 55, paddingVertical: 22, borderTopWidth: 1, borderColor: c.border },
});
