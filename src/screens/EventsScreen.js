import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const EVENT_FILTERS = ['All', 'Group Run', 'Group Workout', 'Competition', 'Open'];

const TYPE_EMOJI = {
  group_run: '🏃',
  group_workout: '🏋️',
  competition: '🏆',
  open_competition: '⚔️',
};

const TYPE_LABEL = {
  group_run: 'Group Run',
  group_workout: 'Group Workout',
  competition: 'Competition',
  open_competition: 'Open Competition',
};

const FILTER_TO_TYPE = {
  'Group Run': 'group_run',
  'Group Workout': 'group_workout',
  'Competition': 'competition',
  'Open': 'open_competition',
};

function formatEventDate(isoString) {
  const d = new Date(isoString);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dayName} ${monthDay} · ${time}`;
}

function getCountdown(isoString) {
  const diff = new Date(isoString) - new Date();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h away`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m away`;
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event, hostName, isRegistered, registeredCount, onRegister, currentUserId }) {
  const isFull = registeredCount >= (event.max_participants || 50);
  const canRegister = !isRegistered && !isFull && event.status === 'upcoming';

  return (
    <View style={styles.eventCard}>
      {/* Header row */}
      <View style={styles.eventCardHeader}>
        <Text style={styles.eventTypeEmoji}>{TYPE_EMOJI[event.event_type] || '📅'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.hostRow}>
            <Text style={styles.hostName}>{hostName || 'Unknown'}</Text>
            <View style={[styles.hostBadge, event.host_type === 'gym' ? styles.gymBadge : styles.teamBadge]}>
              <Text style={styles.hostBadgeText}>{event.host_type === 'gym' ? 'GYM' : 'TEAM'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Date */}
      <Text style={styles.eventDate}>{formatEventDate(event.event_date)}</Text>

      {/* Location */}
      {(event.city || event.state || event.location_name) && (
        <Text style={styles.eventLocation}>
          📍 {[event.location_name, event.city, event.state].filter(Boolean).join(', ')}
        </Text>
      )}

      {/* Distance (runs) */}
      {event.distance_miles && (
        <Text style={styles.eventDistance}>📏 {Number(event.distance_miles).toFixed(1)} mi</Text>
      )}

      {/* Registered count */}
      <Text style={styles.eventCount}>
        {registeredCount} / {event.max_participants || 50} registered
        {isFull && <Text style={styles.fullText}> · FULL</Text>}
      </Text>

      {/* Register button */}
      <View style={styles.eventActions}>
        {isRegistered ? (
          <View style={styles.registeredBadge}>
            <Text style={styles.registeredText}>REGISTERED ✓</Text>
          </View>
        ) : canRegister ? (
          <TouchableOpacity style={styles.registerBtn} onPress={() => onRegister(event)}>
            <Text style={styles.registerBtnText}>REGISTER</Text>
          </TouchableOpacity>
        ) : isFull ? (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>FULL</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── My Event Card ───────────────────────────────────────────────────────────

function MyEventCard({ event, hostName }) {
  return (
    <View style={styles.myEventCard}>
      <View style={styles.myEventLeft}>
        <Text style={styles.myEventEmoji}>{TYPE_EMOJI[event.event_type] || '📅'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.myEventTitle}>{event.title}</Text>
        <Text style={styles.myEventHost}>{hostName}</Text>
        <Text style={styles.myEventCountdown}>{getCountdown(event.event_date)}</Text>
      </View>
      <View style={styles.myEventDateBox}>
        <Text style={styles.myEventDateDay}>
          {new Date(event.event_date).toLocaleDateString('en-US', { day: 'numeric' })}
        </Text>
        <Text style={styles.myEventDateMonth}>
          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [registrationCounts, setRegistrationCounts] = useState({});
  const [hostNames, setHostNames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterChip, setFilterChip] = useState('All');
  const [nearMe, setNearMe] = useState(false);
  const [userState, setUserState] = useState(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Get user profile for state (near me filter)
    const { data: profile } = await supabase
      .from('profiles')
      .select('state')
      .eq('id', user.id)
      .single();
    setUserState(profile?.state || null);

    // Fetch upcoming events
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date');
    const allEvents = ev || [];
    setEvents(allEvents);

    // Fetch registration counts
    const eventIds = allEvents.map((e) => e.id);
    if (eventIds.length > 0) {
      const { data: regCounts } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds);

      const counts = {};
      (regCounts || []).forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      setRegistrationCounts(counts);
    }

    // Fetch my registrations
    const { data: myRegs } = await supabase
      .from('event_registrations')
      .select('event_id, events(*)')
      .eq('user_id', user.id)
      .order('registered_at', { ascending: false });
    setMyRegistrations(myRegs || []);

    // Build host name map: gather gym ids and team ids separately
    const gymHostIds = allEvents.filter((e) => e.host_type === 'gym').map((e) => e.host_id);
    const teamHostIds = allEvents.filter((e) => e.host_type === 'team').map((e) => e.host_id);

    const nameMap = {};

    if (gymHostIds.length > 0) {
      const { data: gymData } = await supabase
        .from('gyms')
        .select('id, name')
        .in('id', gymHostIds);
      (gymData || []).forEach((g) => { nameMap[g.id] = g.name; });
    }

    if (teamHostIds.length > 0) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamHostIds);
      (teamData || []).forEach((t) => { nameMap[t.id] = t.name; });
    }

    setHostNames(nameMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Register ──────────────────────────────────────────────────────────────

  const registerForEvent = async (event) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('event_registrations').insert({
      event_id: event.id,
      user_id: user.id,
    });
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Already registered', 'You are already registered for this event.');
      } else {
        Alert.alert('Error', error.message);
      }
      return;
    }
    Alert.alert('Registered! 🎉', `You're in for ${event.title}`);
    loadData();
  };

  // ── Filter ────────────────────────────────────────────────────────────────

  const myRegisteredEventIds = new Set(myRegistrations.map((r) => r.event_id));

  const filteredEvents = events.filter((ev) => {
    const typeMatch =
      filterChip === 'All' ||
      ev.event_type === FILTER_TO_TYPE[filterChip];
    const locationMatch = !nearMe || !userState || ev.state === userState;
    return typeMatch && locationMatch;
  });

  // My registered events (full event objects)
  const myUpcomingEvents = myRegistrations
    .filter((r) => r.events && new Date(r.events.event_date) >= new Date())
    .map((r) => r.events)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>EVENTS</Text>
        <View style={styles.nearMeRow}>
          <Text style={styles.nearMeLabel}>Near Me</Text>
          <Switch
            value={nearMe}
            onValueChange={setNearMe}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={nearMe ? colors.background : colors.muted}
          />
        </View>
      </View>

      {nearMe && !userState && (
        <Text style={styles.nearMeNote}>Add your state to your profile to use Near Me filter</Text>
      )}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={styles.chipRow}>
          {EVENT_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filterChip === f && styles.chipActive]}
              onPress={() => setFilterChip(f)}
            >
              <Text style={[styles.chipText, filterChip === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Event feed */}
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
      ) : filteredEvents.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {nearMe ? 'No events near you. Try turning off Near Me.' : 'No upcoming events yet.'}
          </Text>
        </Card>
      ) : (
        filteredEvents.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            hostName={hostNames[ev.host_id] || 'Unknown'}
            isRegistered={myRegisteredEventIds.has(ev.id)}
            registeredCount={registrationCounts[ev.id] || 0}
            onRegister={registerForEvent}
            currentUserId={currentUserId}
          />
        ))
      )}

      {/* My Events */}
      {myUpcomingEvents.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>MY EVENTS</Text>
          {myUpcomingEvents.map((ev) => (
            <MyEventCard
              key={ev.id}
              event={ev}
              hostName={hostNames[ev.host_id] || 'Unknown'}
            />
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: colors.gold, letterSpacing: 2 },
  nearMeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nearMeLabel: { fontSize: 13, fontWeight: '600', color: colors.muted },
  nearMeNote: { fontSize: 11, color: colors.muted, marginBottom: 12, fontStyle: 'italic' },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.gold },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginTop: 24, marginBottom: 12,
  },

  // Event card
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  eventCardHeader: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  eventTypeEmoji: { fontSize: 26, marginTop: 2 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: colors.text, lineHeight: 20 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  hostName: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  hostBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gymBadge: { backgroundColor: 'rgba(201,168,76,0.15)', borderWidth: 1, borderColor: colors.gold },
  teamBadge: { backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: colors.blue },
  hostBadgeText: { fontSize: 9, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },

  eventDate: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  eventLocation: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  eventDistance: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  eventCount: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  fullText: { color: colors.error, fontWeight: '700' },

  eventActions: { flexDirection: 'row' },
  registerBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.gold,
  },
  registerBtnText: { color: colors.background, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  registeredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  registeredText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  fullBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: colors.error,
  },
  fullBadgeText: { color: colors.error, fontSize: 12, fontWeight: '700' },

  // My event card
  myEventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
  },
  myEventLeft: { alignItems: 'center', justifyContent: 'center' },
  myEventEmoji: { fontSize: 28 },
  myEventTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  myEventHost: { fontSize: 11, color: colors.muted, marginTop: 2 },
  myEventCountdown: { fontSize: 11, color: colors.gold, fontWeight: '600', marginTop: 3 },
  myEventDateBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
  },
  myEventDateDay: { fontSize: 20, fontWeight: '800', color: colors.gold },
  myEventDateMonth: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 1 },
});
