import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

// ─── Theme ────────────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';
const GREEN = '#00C853';
const RED = '#FF1744';
const BG = '#0a0a0a';
const SURFACE = '#111111';
const MUTED = '#555555';
const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ['LEADERBOARD', 'TEAMS', 'FIND TEAM'];
const SPORT_FILTERS = ['All', 'Running', 'Lifting', 'CrossFit', 'Mixed'];
const SPORT_FOCUSES = ['General', 'Running', 'Lifting', 'CrossFit', 'Mixed', 'Combat Sports'];
const COMP_TYPES = ['Run Race', 'Lifting Challenge', 'Total Volume'];
const RUN_DISTANCES = ['1mi', '5K', '10K', 'Custom'];
const TIME_WINDOWS = ['1 day', '1 week', '2 weeks'];
const VISIBILITY_OPTS = ['Public', 'Team Only'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNum(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString();
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function rankColor(rank) {
  if (rank === 1) return GOLD;
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return MUTED;
}

function msToCountdown(ms) {
  if (ms <= 0) return null; // null = expired
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function msToDayCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ─── FIX 1: TickerTape Component ──────────────────────────────────────────────
// Seamless loop: triple the string, animate 0 → -singleWidth, reset instantly.
// Animation uses useRef so tab changes never stop it.
function TickerTape({ items, started }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const singleWidth = useRef(0);
  const animRef = useRef(null);
  const startedRef = useRef(started);
  const itemsRef = useRef(items);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const baseStr =
    items && items.length > 0
      ? items.map((i) => `  ${i}  ·`).join('  ') + '  '
      : '  AT0M INDEX ↑  ·  MARKETS OPEN  ·  EARN TOKENS TO CLIMB  ·  AT0M FIT EXCHANGE  ·  ';

  // Triple the string for seamless wrap
  const displayStr = baseStr + baseStr + baseStr;

  const runLoop = useCallback(() => {
    if (singleWidth.current === 0) return;
    if (animRef.current) animRef.current.stop();
    translateX.setValue(0);
    const speed = 80; // px per second — real financial ticker feel
    const duration = (singleWidth.current / speed) * 1000;
    const loop = () => {
      translateX.setValue(0);
      animRef.current = Animated.timing(translateX, {
        toValue: -singleWidth.current,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current.start(({ finished }) => {
        if (finished) loop();
      });
    };
    loop();
  }, [translateX]);

  // Start/stop when `started` changes
  useEffect(() => {
    if (started && singleWidth.current > 0) {
      runLoop();
    } else if (!started && animRef.current) {
      animRef.current.stop();
    }
    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [started, runLoop]);

  const handleLayout = (e) => {
    const totalW = e.nativeEvent.layout.width;
    singleWidth.current = totalW / 3;
    if (startedRef.current) runLoop();
  };

  return (
    <View style={st.tickerContainer}>
      <Animated.Text
        style={[st.tickerText, { transform: [{ translateX }] }]}
        onLayout={handleLayout}
        numberOfLines={1}
      >
        {displayStr}
      </Animated.Text>
    </View>
  );
}

// ─── FIX 5: Market Bell Overlay ───────────────────────────────────────────────
// Shows once per calendar day. Bell scales 0.5→1.0 during fade-in.
// Sequence: fade-in 300ms → hold 1200ms → fade-out 500ms → onDone
function MarketBellOverlay({ visible, onDone }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const bellScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    bellScale.setValue(0.5);

    Animated.sequence([
      // Fade in + scale bell simultaneously
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bellScale, {
          toValue: 1.0,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // Hold 1200ms
      Animated.delay(1200),
      // Fade out 500ms
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDone) onDone();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[st.bellOverlay, { opacity }]}>
      <Animated.Text style={[st.bellEmoji, { transform: [{ scale: bellScale }] }]}>
        🔔
      </Animated.Text>
      <Text style={st.bellText}>MARKETS OPEN</Text>
      <Text style={st.bellSub}>AT0M FITNESS EXCHANGE</Text>
    </Animated.View>
  );
}

// ─── FIX 3 + FIX 4: LeaderboardRow ────────────────────────────────────────────
// Count-up animation on mount (staggered). Flash green/red on realtime update.
function LeaderboardRow({ rank, user, isCurrentUser, expanded, onPress, animDelay, flashInfo }) {
  const [displayTokens, setDisplayTokens] = useState(0);
  const tokenAnim = useRef(new Animated.Value(0)).current;
  const [tokenColor, setTokenColor] = useState(GOLD);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // FIX 3: Count-up on mount with stagger
  useEffect(() => {
    const target = user.total_tokens || 0;
    const listenerId = tokenAnim.addListener(({ value }) => {
      setDisplayTokens(Math.floor(value));
    });
    Animated.timing(tokenAnim, {
      toValue: target,
      duration: 800,
      delay: animDelay || 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => tokenAnim.removeListener(listenerId);
  }, []);

  // Update displayed value when user.total_tokens changes (realtime)
  useEffect(() => {
    setDisplayTokens(user.total_tokens || 0);
  }, [user.total_tokens]);

  // FIX 4: Flash on realtime token change
  useEffect(() => {
    if (!flashInfo) return;
    const flashColor = flashInfo.direction === 'up' ? GREEN : RED;
    setTokenColor(flashColor);
    flashAnim.setValue(1);
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => setTokenColor(GOLD));
  }, [flashInfo?.timestamp]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[st.lbRow, isCurrentUser && st.lbRowHighlight]}
      activeOpacity={0.75}
    >
      <Text style={[st.lbRank, { color: rankColor(rank) }]}>#{rank}</Text>
      <View style={[st.lbAvatar, { backgroundColor: rankColor(rank) + '33', borderColor: rankColor(rank) }]}>
        <Text style={[st.lbAvatarText, { color: rankColor(rank) }]}>{getInitial(user.username)}</Text>
      </View>
      <View style={st.lbInfo}>
        <Text style={st.lbName}>{(user.username || 'UNKNOWN').toUpperCase()}</Text>
        {user.team_name ? <Text style={st.lbTeam}>{user.team_name}</Text> : null}
      </View>
      <View style={st.lbRight}>
        <Text style={[st.lbTokens, { color: tokenColor }]}>
          {formatNum(displayTokens)} ⚛
        </Text>
        <Text style={[st.lbChange, { color: MUTED }]}>— 0</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── FIX 7: TeamRow with weekly change % ──────────────────────────────────────
function TeamMarketRow({ rank, team, isMyTeam, onManage, altBg, weeklyChange }) {
  let changeEl = null;
  if (weeklyChange !== null && weeklyChange !== undefined) {
    const isUp = weeklyChange >= 0;
    const arrow = isUp ? '↑' : '↓';
    const sign = isUp ? '+' : '';
    changeEl = (
      <Text style={[st.teamWeeklyChange, { color: isUp ? GREEN : RED }]}>
        {arrow} {sign}{weeklyChange.toFixed(1)}%
      </Text>
    );
  } else {
    changeEl = <Text style={[st.teamWeeklyChange, { color: MUTED }]}>—</Text>;
  }

  return (
    <View style={[st.teamRow, { backgroundColor: altBg ? BG : SURFACE }, isMyTeam && st.teamRowHighlight]}>
      <Text style={[st.teamRank, { color: rankColor(rank) }]}>#{rank}</Text>
      <View style={st.teamInfo}>
        <Text style={st.teamName}>{(team.name || 'UNNAMED').toUpperCase()}</Text>
        {(team.city || team.state) ? (
          <Text style={st.teamLocation}>{[team.city, team.state].filter(Boolean).join(', ')}</Text>
        ) : null}
      </View>
      <Text style={st.teamMembers}>{team._memberCount || '—'}</Text>
      <View style={st.teamTokensCol}>
        <Text style={st.teamTokens}>{formatNum(team.total_tokens)} ⚛</Text>
        {changeEl}
      </View>
      {isMyTeam && onManage && (
        <TouchableOpacity style={st.manageBtn} onPress={onManage}>
          <Text style={st.manageBtnText}>MANAGE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── TeamDiscoverCard ──────────────────────────────────────────────────────────
function TeamDiscoverCard({ team, memberCount, isMember, hasPendingRequest, onRequestJoin }) {
  const fillPct = team.max_members > 0 ? Math.min(memberCount / team.max_members, 1) : 0;
  const isFull = team.status === 'full' || memberCount >= (team.max_members || 10);

  return (
    <View style={st.discoverCard}>
      <View style={st.discoverHeader}>
        <Text style={st.discoverTeamName}>{team.name}</Text>
        <View style={[st.statusBadge, isFull ? st.statusFull : st.statusOpen]}>
          <Text style={[st.statusBadgeText, { color: isFull ? RED : GREEN }]}>
            {isFull ? 'FULL' : 'OPEN'}
          </Text>
        </View>
      </View>
      {(team.city || team.state) ? (
        <Text style={st.discoverLocation}>📍 {[team.city, team.state].filter(Boolean).join(', ')}</Text>
      ) : null}
      <View style={st.discoverMeta}>
        {team.sport_focus ? (
          <View style={st.sportBadge}><Text style={st.sportBadgeText}>{team.sport_focus}</Text></View>
        ) : null}
        <Text style={st.memberCount}>{memberCount} / {team.max_members || 10} members</Text>
      </View>
      <View style={st.fillBarBg}>
        <View style={[st.fillBarFg, { width: `${fillPct * 100}%` }]} />
      </View>
      {team.description ? (
        <Text style={st.discoverDesc} numberOfLines={2}>{team.description}</Text>
      ) : null}
      <View style={st.discoverActions}>
        {isMember ? (
          <View style={st.memberBadge}><Text style={st.memberBadgeText}>✓ MEMBER</Text></View>
        ) : hasPendingRequest ? (
          <Text style={st.requestedText}>REQUESTED ✓</Text>
        ) : !isFull ? (
          <TouchableOpacity style={st.requestBtn} onPress={() => onRequestJoin(team)}>
            <Text style={st.requestBtnText}>REQUEST TO JOIN</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── FIX 6: CompetitionCard with live countdown, red pulse, CLOSED badge ──────
function CompetitionCard({ comp, currentUserId, onEnter, onResults }) {
  const [countdown, setCountdown] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(comp.event_date) - new Date();
      if (diff <= 0) {
        setIsExpired(true);
        setCountdown('CLOSED');
        if (pulseLoop.current) {
          pulseLoop.current.stop();
          pulseAnim.setValue(1);
        }
        return;
      }
      const cdStr = msToCountdown(diff);
      setCountdown(cdStr || 'CLOSED');
      setIsExpired(false);

      // FIX 6: < 1 hour → red pulse
      const underOneHour = diff < 3600000;
      setIsWarning(underOneHour);
      if (underOneHour && !pulseLoop.current) {
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
          ])
        );
        pulseLoop.current.start();
      } else if (!underOneHour && pulseLoop.current) {
        pulseLoop.current.stop();
        pulseAnim.setValue(1);
        pulseLoop.current = null;
      }
    };

    tick();
    const id = setInterval(tick, 1000); // every second
    return () => {
      clearInterval(id);
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, [comp.event_date]);

  if (isExpired) return null; // Remove expired from active list

  const isHost = comp.hosted_by === currentUserId;

  return (
    <View style={st.compCard}>
      <View style={st.compCardTop}>
        <Text style={st.compCardTitle}>⚔️  {comp.title}</Text>
        {isHost && (
          <View style={st.hostTag}><Text style={st.hostTagText}>HOST</Text></View>
        )}
      </View>
      <Animated.Text
        style={[
          st.compCountdown,
          { color: isWarning ? RED : GOLD, opacity: isWarning ? pulseAnim : 1 },
        ]}
      >
        Closes in  {countdown}
      </Animated.Text>
      {comp.description ? (
        <Text style={st.compCardDesc}>{comp.description}</Text>
      ) : null}
      <Text style={st.compCardMeta}>
        {comp.is_public ? '🌐 Public' : '🔒 Team Only'}
        {comp.distance_miles ? `  ·  ${comp.distance_miles} mi` : ''}
      </Text>
      <TouchableOpacity style={st.compResultsBtn} onPress={() => onResults(comp)}>
        <Text style={st.compResultsBtnText}>📊 RESULTS / SUBMIT</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CompeteScreen() {
  const [activeTab, setActiveTab] = useState('LEADERBOARD');
  const [globalRows, setGlobalRows] = useState([]);
  const [teamRows, setTeamRows] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // FIX 2: AT0M FITNESS INDEX with count-up animation
  const [fitnessIndexTarget, setFitnessIndexTarget] = useState(0);
  const [fitnessIndexDisplay, setFitnessIndexDisplay] = useState(0);
  const indexAnim = useRef(new Animated.Value(0)).current;

  // Ticker
  const [tickerItems, setTickerItems] = useState([]);

  // FIX 5: Ticker only starts AFTER bell animation completes
  const [tickerStarted, setTickerStarted] = useState(false);

  // Market Bell
  const [showBell, setShowBell] = useState(false);

  // Market close countdown (to midnight)
  const [closeCountdown, setCloseCountdown] = useState('');

  // FIX 4: Realtime token flash map: userId → { direction: 'up'|'down', timestamp }
  const [tokenFlashes, setTokenFlashes] = useState({});
  const realtimeSubRef = useRef(null);

  // FIX 7: Team weekly change snapshot
  const [teamOldSnapshot, setTeamOldSnapshot] = useState(null);

  // Create Team
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createState, setCreateState] = useState('');
  const [createSport, setCreateSport] = useState('General');
  const [createMaxMembers, setCreateMaxMembers] = useState('10');
  const [actionLoading, setActionLoading] = useState(false);

  // Find Team
  const [openTeams, setOpenTeams] = useState([]);
  const [findLoading, setFindLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [myMemberships, setMyMemberships] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [findInputFocused, setFindInputFocused] = useState(false);

  // Join Request Modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinTargetTeam, setJoinTargetTeam] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinLocation, setJoinLocation] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  // Competition
  const [compModalVisible, setCompModalVisible] = useState(false);
  const [compType, setCompType] = useState('Run Race');
  const [compRunDist, setCompRunDist] = useState('5K');
  const [compCustomDist, setCompCustomDist] = useState('');
  const [compExercise, setCompExercise] = useState('');
  const [compWindow, setCompWindow] = useState('1 week');
  const [compVisibility, setCompVisibility] = useState('Public');
  const [compCreating, setCompCreating] = useState(false);
  const [activeComps, setActiveComps] = useState([]);
  const [compsLoading, setCompsLoading] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedComp, setSelectedComp] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [compResults, setCompResults] = useState([]);
  const [resultSubmitting, setResultSubmitting] = useState(false);

  // Management Modal
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [manageTeam, setManageTeam] = useState(null);
  const [manageName, setManageName] = useState('');
  const [manageDesc, setManageDesc] = useState('');
  const [manageCity, setManageCity] = useState('');
  const [manageState, setManageState] = useState('');
  const [manageSport, setManageSport] = useState('General');
  const [manageMaxMembers, setManageMaxMembers] = useState('10');
  const [manageStatus, setManageStatus] = useState('open');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [manageSaving, setManageSaving] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);

  // ── FIX 2: Animate fitness index when target is set ───────────────────────
  useEffect(() => {
    if (fitnessIndexTarget <= 0) return;
    const listenerId = indexAnim.addListener(({ value }) => {
      setFitnessIndexDisplay(Math.floor(value));
    });
    indexAnim.setValue(0);
    Animated.timing(indexAnim, {
      toValue: fitnessIndexTarget,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => indexAnim.removeListener(listenerId);
  }, [fitnessIndexTarget]);

  // ── Market close countdown ─────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setCloseCountdown(msToDayCountdown(midnight - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── FIX 5: Market Bell (once per day) ────────────────────────────────────
  useEffect(() => {
    const checkBell = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = await AsyncStorage.getItem('marketBellDate');
      if (lastShown !== today) {
        setShowBell(true);
        await AsyncStorage.setItem('marketBellDate', today);
      } else {
        // Bell already shown today — start ticker immediately
        setTickerStarted(true);
      }
    };
    checkBell();
  }, []);

  // ── FIX 4: Supabase Realtime subscription ─────────────────────────────────
  useEffect(() => {
    const sub = supabase
      .channel('profiles-tokens')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          if (!newRecord?.id) return;

          const newTokens = newRecord.total_tokens || 0;
          const oldTokens = oldRecord?.total_tokens || 0;
          const direction = newTokens >= oldTokens ? 'up' : 'down';

          // Update the global rows token count
          setGlobalRows((prev) =>
            prev.map((row) =>
              row.user_id === newRecord.id
                ? { ...row, total_tokens: newTokens }
                : row
            )
          );

          // Trigger flash animation for this row
          setTokenFlashes((prev) => ({
            ...prev,
            [newRecord.id]: { direction, timestamp: Date.now() },
          }));
        }
      )
      .subscribe();

    realtimeSubRef.current = sub;
    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Global leaderboard
    const { data: lb } = await supabase
      .from('leaderboard')
      .select('user_id, username, team_name, total_tokens')
      .order('total_tokens', { ascending: false })
      .limit(20);
    setGlobalRows(lb || []);

    // Teams leaderboard
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, total_tokens, city, state, created_by, status, max_members, sport_focus')
      .order('total_tokens', { ascending: false })
      .limit(15);

    if (teams) {
      const enriched = await Promise.all(
        teams.map(async (t) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', t.id);
          return { ...t, _memberCount: count || 0 };
        })
      );
      setTeamRows(enriched);
      // FIX 7: Load/store team snapshots after teams load
      loadTeamSnapshots(enriched);
    } else {
      setTeamRows([]);
    }

    // My memberships
    const { data: memberships } = await supabase
      .from('team_members')
      .select('id, team_id, is_lead, teams(id, name, total_tokens, city, state)')
      .eq('user_id', user.id);
    setMyMemberships(memberships || []);
    setMyTeam(memberships && memberships.length > 0 ? memberships[0] : null);

    // My join requests
    const { data: requests } = await supabase
      .from('team_join_requests')
      .select('id, team_id, status, message, teams(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyRequests(requests || []);

    setLoading(false);
  }, []);

  // ── FIX 7: Team snapshot logic ─────────────────────────────────────────────
  const loadTeamSnapshots = useCallback(async (teams) => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    // Store today's snapshot if not already stored
    const todayKey = `teamSnapshot_${today}`;
    const existingToday = await AsyncStorage.getItem(todayKey);
    if (!existingToday) {
      const snapshot = {};
      teams.forEach((t) => { snapshot[t.id] = t.total_tokens || 0; });
      await AsyncStorage.setItem(todayKey, JSON.stringify(snapshot));
    }

    // Load 7-days-ago snapshot for comparison
    const oldKey = `teamSnapshot_${sevenDaysAgo}`;
    const oldSnapshotStr = await AsyncStorage.getItem(oldKey);
    if (oldSnapshotStr) {
      try {
        setTeamOldSnapshot(JSON.parse(oldSnapshotStr));
      } catch (_) {
        setTeamOldSnapshot(null);
      }
    } else {
      setTeamOldSnapshot(null);
    }
  }, []);

  const loadCompetitions = useCallback(async () => {
    setCompsLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('event_type', 'open_competition')
      .in('status', ['upcoming', 'active'])
      .order('event_date')
      .limit(3);
    setActiveComps(data || []);
    setCompsLoading(false);
  }, []);

  const loadCompResults = useCallback(async (eventId) => {
    const { data } = await supabase
      .from('event_registrations')
      .select('*, profiles(full_name)')
      .eq('event_id', eventId)
      .order('result_value', { ascending: true });
    setCompResults(data || []);
  }, []);

  const loadOpenTeams = useCallback(async () => {
    setFindLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*, team_members(count)')
      .in('status', ['open', 'full'])
      .order('total_tokens', { ascending: false });
    setOpenTeams(data || []);
    setFindLoading(false);
  }, []);

  // ── FIX 2: Real DB data for AT0M FITNESS INDEX ────────────────────────────
  const loadFitnessIndex = useCallback(async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // workoutsThisWeek
      let workoutsThisWeek = 0;
      try {
        const { count } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString());
        workoutsThisWeek = count || 0;
      } catch (_) {}

      // totalMilesThisWeek from runs
      let totalMilesThisWeek = 0;
      try {
        const { data: runs } = await supabase
          .from('runs')
          .select('distance')
          .gte('created_at', weekAgo.toISOString());
        if (runs) {
          totalMilesThisWeek = runs.reduce((sum, r) => sum + (parseFloat(r.distance) || 0), 0);
        }
      } catch (_) {}

      // tokensAwardedToday — sum all profiles' tokens as proxy for platform activity
      let tokensAwardedToday = 0;
      try {
        const { data: todayProfiles } = await supabase
          .from('leaderboard')
          .select('total_tokens');
        if (todayProfiles) {
          tokensAwardedToday = todayProfiles.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
          // Scale down for index readability
          tokensAwardedToday = Math.floor(tokensAwardedToday / 50);
        }
      } catch (_) {}

      const index = Math.floor(
        (workoutsThisWeek * 10) + (totalMilesThisWeek * 5) + (tokensAwardedToday * 2)
      );

      setFitnessIndexTarget(index > 0 ? index : 1247); // fallback to base value
    } catch (e) {
      setFitnessIndexTarget(1247);
    }
  }, []);

  // ── FIX 1: Real DB ticker content ─────────────────────────────────────────
  const loadTickerItems = useCallback(async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const items = [];

    try {
      // Recent runs in last 4 hours
      const { data: recentRuns } = await supabase
        .from('runs')
        .select('distance, created_at, profiles(full_name)')
        .gte('created_at', fourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentRuns && recentRuns.length > 0) {
        recentRuns.forEach((r) => {
          const name = (r.profiles?.full_name || 'ATHLETE').toUpperCase();
          const dist = parseFloat(r.distance || 0).toFixed(1);
          items.push(`🏃 ${name} ran ${dist}mi`);
        });
      }

      // Recent workouts in last 4 hours
      const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('created_at, profiles(full_name)')
        .gte('created_at', fourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentWorkouts && recentWorkouts.length > 0) {
        recentWorkouts.forEach((w) => {
          const name = (w.profiles?.name || 'ATHLETE').toUpperCase();
          items.push(`💪 ${name} completed a workout`);
        });
      }
    } catch (_) {}

    // Always add top leaderboard entries
    try {
      const { data: top } = await supabase
        .from('leaderboard')
        .select('username, total_tokens')
        .order('total_tokens', { ascending: false })
        .limit(5);

      if (top && top.length > 0) {
        const medals = ['🥇', '🥈', '🥉', '⚛️', '⚛️'];
        top.forEach((u, i) => {
          items.push(`${medals[i]} ${(u.username || 'ATHLETE').toUpperCase()} — ${formatNum(u.total_tokens)} tokens`);
        });
      }
    } catch (_) {}

    if (items.length === 0) {
      // Fallback platform stats
      try {
        const { count: userCount } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true });
        items.push(`AT0M INDEX ↑`);
        items.push(`${userCount || 0} athletes competing`);
        items.push(`MARKETS OPEN — EARN YOUR RANK`);
      } catch (_) {
        items.push('AT0M INDEX ↑');
        items.push('MARKETS OPEN — EARN YOUR RANK');
      }
    }

    setTickerItems(items);
  }, []);

  useEffect(() => {
    loadData();
    loadFitnessIndex();
    loadTickerItems();
    loadCompetitions();
  }, [loadData, loadFitnessIndex, loadTickerItems, loadCompetitions]);

  useEffect(() => {
    if (activeTab === 'FIND TEAM') loadOpenTeams();
  }, [activeTab, loadOpenTeams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadFitnessIndex();
    await loadTickerItems();
    await loadCompetitions();
    if (activeTab === 'FIND TEAM') await loadOpenTeams();
    setRefreshing(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const myTeamIds = myMemberships.map((m) => m.team_id);
  const myRequestMap = {};
  myRequests.forEach((r) => { myRequestMap[r.team_id] = r; });

  const filteredTeams = openTeams.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      t.name?.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q) ||
      t.state?.toLowerCase().includes(q);
    const matchesSport = sportFilter === 'All' ||
      t.sport_focus?.toLowerCase() === sportFilter.toLowerCase();
    return matchesSearch && matchesSport;
  });

  const getMemberCount = (team) => {
    const countData = team.team_members;
    if (Array.isArray(countData) && countData.length > 0) {
      return countData[0]?.count ?? countData.length;
    }
    return 0;
  };

  // Top gainers / drops
  const topGainers = [...globalRows].slice(0, 3);
  const bottomDrop = [...globalRows].slice(-3).reverse();

  // ── Create Team ─────────────────────────────────────────────────────────────
  const createTeam = async () => {
    if (!createName.trim()) { Alert.alert('Required', 'Enter a team name.'); return; }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newTeam, error: teamError } = await supabase.from('teams').insert({
      name: createName.trim(),
      description: createDesc.trim() || null,
      city: createCity.trim() || null,
      state: createState.trim() || null,
      sport_focus: createSport.toLowerCase(),
      max_members: parseInt(createMaxMembers, 10) || 10,
      status: 'open',
      created_by: user.id,
      total_tokens: 0,
    }).select().single();
    if (teamError) { Alert.alert('Error', teamError.message); setActionLoading(false); return; }
    await supabase.from('team_members').insert({
      user_id: user.id, team_id: newTeam.id, tokens_contributed: 0, is_lead: true,
    });
    setActionLoading(false);
    setShowCreateForm(false);
    setCreateName(''); setCreateDesc(''); setCreateCity(''); setCreateState('');
    setCreateSport('General'); setCreateMaxMembers('10');
    Alert.alert('Team Created! 🏆', `Welcome to ${newTeam.name}`);
    loadData();
  };

  // ── Competition ─────────────────────────────────────────────────────────────
  const buildCompTitle = () => {
    if (compType === 'Run Race') {
      const dist = compRunDist === 'Custom' ? (compCustomDist || 'Run') : compRunDist;
      return `${dist} Race`;
    }
    if (compType === 'Lifting Challenge') return `${compExercise || 'Lifting'} Challenge`;
    return 'Total Volume Challenge';
  };

  const getWindowEnd = () => {
    const d = new Date();
    if (compWindow === '1 day') d.setDate(d.getDate() + 1);
    else if (compWindow === '1 week') d.setDate(d.getDate() + 7);
    else if (compWindow === '2 weeks') d.setDate(d.getDate() + 14);
    return d.toISOString();
  };

  const createCompetition = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCompCreating(true);
    const title = buildCompTitle();
    const { data: newEvent, error } = await supabase.from('events').insert({
      title,
      event_type: 'open_competition',
      host_type: 'team',
      host_id: myTeam?.team_id || user.id,
      hosted_by: user.id,
      event_date: getWindowEnd(),
      is_public: compVisibility === 'Public',
      status: 'active',
      description: compType === 'Lifting Challenge' ? `Exercise: ${compExercise}` : null,
      distance_miles:
        compType === 'Run Race' && compRunDist !== 'Custom'
          ? { '1mi': 1.0, '5K': 3.1, '10K': 6.2 }[compRunDist]
          : compType === 'Run Race' && compCustomDist
            ? parseFloat(compCustomDist)
            : null,
    }).select().single();
    setCompCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setCompModalVisible(false);
    loadCompetitions();
    Alert.alert('Competition Live! ⚔️', `"${title}" is now active.`);
  };

  const openResultModal = async (comp) => {
    setSelectedComp(comp);
    setResultUnit(comp.distance_miles ? 'seconds' : 'reps/lbs');
    setResultValue('');
    setResultModalVisible(true);
    await loadCompResults(comp.id);
  };

  const submitResult = async () => {
    if (!resultValue.trim()) { Alert.alert('Required', 'Enter your result.'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setResultSubmitting(true);
    const { error } = await supabase.from('event_registrations').upsert({
      event_id: selectedComp.id,
      user_id: user.id,
      result_value: parseFloat(resultValue),
      result_unit: resultUnit,
    }, { onConflict: 'event_id,user_id' });
    setResultSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Result Submitted! ✅', 'Your result has been recorded.');
    await loadCompResults(selectedComp.id);
  };

  const leaveTeam = () => {
    Alert.alert('Leave Team', `Leave ${myTeam?.teams?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await supabase.from('team_members').delete().eq('id', myTeam.id);
          setMyTeam(null);
          loadData();
        },
      },
    ]);
  };

  // ── Join Request ─────────────────────────────────────────────────────────────
  const openJoinModal = (team) => {
    setJoinTargetTeam(team);
    setJoinMessage('');
    setJoinLocation('');
    setJoinModalVisible(true);
  };

  const submitJoinRequest = async () => {
    if (!joinTargetTeam) return;
    setJoinSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('team_join_requests').insert({
      team_id: joinTargetTeam.id,
      user_id: user.id,
      message: joinMessage.trim() || null,
      status: 'pending',
    });
    if (error) { Alert.alert('Error', error.message); }
    else {
      setJoinModalVisible(false);
      Alert.alert('Request Sent! ✅', `Your request to join ${joinTargetTeam.name} has been sent.`);
      await loadData();
    }
    setJoinSubmitting(false);
  };

  const acceptApprovedRequest = async (request) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', request.team_id)
      .single();
    if (!existing) {
      const { error } = await supabase.from('team_members').insert({
        user_id: user.id, team_id: request.team_id, tokens_contributed: 0, is_lead: false,
      });
      if (error) { Alert.alert('Error', error.message); return; }
    }
    await supabase.from('team_join_requests')
      .update({ responded_at: new Date().toISOString() })
      .eq('id', request.id);
    Alert.alert('Joined! 🤝', `You're now on team ${request.teams?.name}`);
    loadData();
  };

  // ── Management Modal ──────────────────────────────────────────────────────
  const openManageModal = async (team) => {
    setManageTeam(team);
    setManageName(team.name || '');
    setManageDesc(team.description || '');
    setManageCity(team.city || '');
    setManageState(team.state || '');
    setManageSport(
      SPORT_FOCUSES.find((s) => s.toLowerCase() === (team.sport_focus || 'general')) || 'General'
    );
    setManageMaxMembers(String(team.max_members || 10));
    setManageStatus(team.status || 'open');
    setManageModalVisible(true);
    setManageLoading(true);
    const { data: requests } = await supabase
      .from('team_join_requests')
      .select('id, user_id, message, created_at, profiles(name, city, state)')
      .eq('team_id', team.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPendingRequests(requests || []);
    setManageLoading(false);
  };

  const saveTeamChanges = async () => {
    if (!manageName.trim()) { Alert.alert('Required', 'Team name cannot be empty.'); return; }
    setManageSaving(true);
    const { error } = await supabase.from('teams').update({
      name: manageName.trim(),
      description: manageDesc.trim() || null,
      city: manageCity.trim() || null,
      state: manageState.trim() || null,
      sport_focus: manageSport.toLowerCase(),
      max_members: parseInt(manageMaxMembers, 10) || 10,
      status: manageStatus,
    }).eq('id', manageTeam.id);
    if (error) { Alert.alert('Error', error.message); }
    else { Alert.alert('Saved! ✅', 'Team settings updated.'); loadData(); }
    setManageSaving(false);
  };

  const approveRequest = async (req) => {
    const { error: memberErr } = await supabase.from('team_members').upsert({
      user_id: req.user_id, team_id: manageTeam.id, tokens_contributed: 0, is_lead: false,
    }, { onConflict: 'user_id,team_id' });
    if (memberErr) { Alert.alert('Error', memberErr.message); return; }
    await supabase.from('team_join_requests').update({
      status: 'approved', responded_at: new Date().toISOString(),
    }).eq('id', req.id);
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    Alert.alert('Approved! ✅', `${req.profiles?.name || 'User'} has been added to your team.`);
    loadData();
  };

  const declineRequest = async (req) => {
    await supabase.from('team_join_requests').update({
      status: 'rejected', responded_at: new Date().toISOString(),
    }).eq('id', req.id);
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={st.root}>
      {/* ── FIX 5: MARKET BELL OVERLAY ── */}
      <MarketBellOverlay
        visible={showBell}
        onDone={() => {
          setShowBell(false);
          setTickerStarted(true); // Start ticker AFTER bell
        }}
      />

      {/* ── FIX 1: TICKER TAPE — won't stop on tab change, starts after bell ── */}
      <TickerTape items={tickerItems} started={tickerStarted} />

      {/* ── MAIN SCROLL ── */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />
        }
      >
        {/* ── FIX 2: AT0M FITNESS INDEX with count-up ── */}
        <View style={st.indexCard}>
          <Text style={st.indexLabel}>AT0M FITNESS INDEX</Text>
          <View style={st.indexRow}>
            <Text style={st.indexValue}>{formatNum(fitnessIndexDisplay)}</Text>
            <Text style={st.indexChange}> ↑ LIVE</Text>
          </View>
          <Text style={st.indexSub}>Platform activity index · updates daily</Text>
        </View>

        {/* ── TAB BAR ── */}
        <View style={st.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[st.tabItem, activeTab === t && st.tabItemActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[st.tabText, activeTab === t && st.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={st.tabSeparator} />

        {/* ──────────────────────────────────────────────── */}
        {/* LEADERBOARD TAB                                  */}
        {/* ──────────────────────────────────────────────── */}
        {activeTab === 'LEADERBOARD' && (
          <>
            {/* My Team Banner */}
            {myTeam ? (
              <View style={st.myTeamBanner}>
                <View>
                  <Text style={st.myTeamLabel}>YOUR TEAM</Text>
                  <Text style={st.myTeamName}>{myTeam.teams?.name}</Text>
                </View>
                <TouchableOpacity style={st.leaveBtn} onPress={leaveTeam}>
                  <Text style={st.leaveBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={st.noTeamBanner}>
                <Text style={st.noTeamText}>Not on a team yet.</Text>
                <View style={st.noTeamActions}>
                  <TouchableOpacity
                    style={st.noTeamCreate}
                    onPress={() => setShowCreateForm((v) => !v)}
                  >
                    <Text style={st.noTeamCreateText}>CREATE TEAM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.noTeamFind}
                    onPress={() => setActiveTab('FIND TEAM')}
                  >
                    <Text style={st.noTeamFindText}>FIND A TEAM</Text>
                  </TouchableOpacity>
                </View>
                {showCreateForm && renderCreateForm()}
              </View>
            )}

            {/* Gainers / Losers row */}
            <View style={st.gainLossRow}>
              <View style={st.gainCol}>
                <Text style={st.gainLabel}>▲ TOP GAINERS</Text>
                {topGainers.map((u) => (
                  <View key={u.user_id} style={st.miniRow}>
                    <Text style={st.miniName} numberOfLines={1}>
                      {(u.username || 'N/A').toUpperCase().slice(0, 12)}
                    </Text>
                    <Text style={[st.miniDelta, { color: GREEN }]}>
                      +{formatNum(u.total_tokens)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={st.lossCol}>
                <Text style={st.lossLabel}>▼ BIGGEST DROPS</Text>
                {bottomDrop.map((u) => (
                  <View key={u.user_id} style={[st.miniRow, { justifyContent: 'flex-end' }]}>
                    <Text style={[st.miniDelta, { color: RED }]}>
                      {formatNum(u.total_tokens)}
                    </Text>
                    <Text style={[st.miniName, { textAlign: 'right', marginLeft: 4 }]} numberOfLines={1}>
                      {(u.username || 'N/A').toUpperCase().slice(0, 12)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* FIX 3 + FIX 4: Main leaderboard with staggered count-up + realtime flash */}
            <Text style={st.sectionLabel}>TOP 20 OPERATORS</Text>
            {loading ? (
              <ActivityIndicator color={GOLD} style={{ marginVertical: 20 }} />
            ) : globalRows.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyText}>No rankings yet. Start training to earn points!</Text>
              </View>
            ) : (
              <View style={st.lbContainer}>
                {globalRows.map((row, i) => (
                  <View key={row.id}>
                    <LeaderboardRow
                      rank={i + 1}
                      user={row}
                      isCurrentUser={row.user_id === currentUserId}
                      expanded={expandedRow === row.id}
                      onPress={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                      animDelay={i * 100} // stagger: 0ms, 100ms, 200ms...
                      flashInfo={tokenFlashes[row.id] || null}
                    />
                    {expandedRow === row.id && (
                      <View style={st.expandedRow}>
                        <Text style={st.expandedText}>Weekly workouts: —  ·  Runs: —  ·  Top lift: —</Text>
                      </View>
                    )}
                    {i < globalRows.length - 1 && <View style={st.divider} />}
                  </View>
                ))}
              </View>
            )}

            {/* Active Competitions */}
            <View style={st.compSectionHeader}>
              <Text style={st.sectionLabel}>ACTIVE COMPETITIONS</Text>
              <TouchableOpacity style={st.newCompBtn} onPress={() => setCompModalVisible(true)}>
                <Text style={st.newCompBtnText}>+ NEW</Text>
              </TouchableOpacity>
            </View>
            {compsLoading ? (
              <ActivityIndicator color={GOLD} style={{ marginVertical: 16 }} />
            ) : activeComps.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyText}>No active competitions.</Text>
              </View>
            ) : (
              activeComps.map((comp) => (
                <CompetitionCard
                  key={comp.id}
                  comp={comp}
                  currentUserId={currentUserId}
                  onResults={openResultModal}
                />
              ))
            )}
            <TouchableOpacity style={st.startCompBtn} onPress={() => setCompModalVisible(true)}>
              <Text style={st.startCompBtnText}>+ START A COMPETITION</Text>
            </TouchableOpacity>

            {/* Market Bell / Close */}
            <View style={st.marketCloseRow}>
              <Text style={st.marketCloseText}>
                🔔 MARKETS OPEN · Next close in {closeCountdown}
              </Text>
            </View>
          </>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/* TEAMS TAB                                        */}
        {/* ──────────────────────────────────────────────── */}
        {activeTab === 'TEAMS' && (
          <>
            {myTeam ? (
              <View style={st.myTeamBanner}>
                <View>
                  <Text style={st.myTeamLabel}>YOUR TEAM</Text>
                  <Text style={st.myTeamName}>{myTeam.teams?.name}</Text>
                </View>
                <TouchableOpacity style={st.leaveBtn} onPress={leaveTeam}>
                  <Text style={st.leaveBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={st.sectionLabel}>MARKET CAP RANKINGS</Text>

            {/* Header row */}
            <View style={st.teamHeaderRow}>
              <Text style={[st.teamHeaderCell, { width: 36 }]}>RANK</Text>
              <Text style={[st.teamHeaderCell, { flex: 1 }]}>TEAM</Text>
              <Text style={[st.teamHeaderCell, { width: 48, textAlign: 'center' }]}>MBR</Text>
              <Text style={[st.teamHeaderCell, { width: 90, textAlign: 'right' }]}>MKT CAP</Text>
              <Text style={[st.teamHeaderCell, { width: 60, textAlign: 'right' }]}>7D CHG</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={GOLD} style={{ marginVertical: 20 }} />
            ) : teamRows.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyText}>No teams yet. Create one!</Text>
              </View>
            ) : (
              // FIX 7: Calculate weekly change from snapshot
              teamRows.map((team, i) => {
                const isMyTeam = myTeamIds.includes(team.id);
                const isCreator = team.created_by === currentUserId;
                let weeklyChange = null;
                if (teamOldSnapshot && teamOldSnapshot[team.id] != null) {
                  const oldTokens = teamOldSnapshot[team.id];
                  const current = team.total_tokens || 0;
                  if (oldTokens > 0) {
                    weeklyChange = ((current - oldTokens) / oldTokens) * 100;
                  }
                }
                return (
                  <TeamMarketRow
                    key={team.id}
                    rank={i + 1}
                    team={team}
                    isMyTeam={isMyTeam}
                    altBg={i % 2 === 0}
                    weeklyChange={weeklyChange}
                    onManage={isCreator ? () => openManageModal(team) : undefined}
                  />
                );
              })
            )}

            <TouchableOpacity style={st.startCompBtn} onPress={() => setCompModalVisible(true)}>
              <Text style={st.startCompBtnText}>⚔️  START COMPETITION</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ──────────────────────────────────────────────── */}
        {/* FIND TEAM TAB                                    */}
        {/* ──────────────────────────────────────────────── */}
        {activeTab === 'FIND TEAM' && (
          <>
            <Text style={st.sectionLabel}>BROWSE OPEN TEAMS</Text>

            <TextInput
              style={[st.terminalInput, findInputFocused && st.terminalInputFocused]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFindInputFocused(true)}
              onBlur={() => setFindInputFocused(false)}
              placeholder="> SEARCH BY CITY, STATE, OR TEAM NAME..."
              placeholderTextColor={MUTED}
              fontFamily={MONO}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={st.chipRow}>
                {SPORT_FILTERS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[st.chip, sportFilter === s && st.chipActive]}
                    onPress={() => setSportFilter(s)}
                  >
                    <Text style={[st.chipText, sportFilter === s && st.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {findLoading ? (
              <ActivityIndicator color={GOLD} style={{ marginVertical: 30 }} />
            ) : filteredTeams.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyText}>No teams found. Try a different search.</Text>
              </View>
            ) : (
              filteredTeams.map((team) => (
                <TeamDiscoverCard
                  key={team.id}
                  team={team}
                  memberCount={getMemberCount(team)}
                  isMember={myTeamIds.includes(team.id)}
                  hasPendingRequest={myRequestMap[team.id]?.status === 'pending'}
                  onRequestJoin={openJoinModal}
                />
              ))
            )}

            {/* My Requests */}
            {myRequests.length > 0 && (
              <>
                <Text style={[st.sectionLabel, { marginTop: 24 }]}>MY REQUESTS</Text>
                {myRequests.map((req) => (
                  <View key={req.id} style={st.myRequestRow}>
                    <Text style={st.myRequestTeam}>{req.teams?.name || 'Unknown Team'}</Text>
                    <View style={[
                      st.reqStatusBadge,
                      req.status === 'approved' && st.reqApproved,
                      req.status === 'rejected' && st.reqRejected,
                      req.status === 'pending' && st.reqPending,
                    ]}>
                      <Text style={st.reqStatusText}>{req.status.toUpperCase()}</Text>
                    </View>
                    {req.status === 'approved' && !myTeamIds.includes(req.team_id) && (
                      <TouchableOpacity style={st.joinNowBtn} onPress={() => acceptApprovedRequest(req)}>
                        <Text style={st.joinNowText}>JOIN NOW</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODALS                                                               */}
      {/* ──────────────────────────────────────────────────────────────────── */}

      {/* START COMPETITION MODAL */}
      <Modal visible={compModalVisible} animationType="slide" transparent onRequestClose={() => setCompModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <ScrollView contentContainerStyle={st.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>⚔️  START COMPETITION</Text>
              <TouchableOpacity onPress={() => setCompModalVisible(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.formLabel}>COMPETITION TYPE</Text>
            <View style={[st.chipRow, { marginBottom: 14 }]}>
              {COMP_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[st.chip, compType === t && st.chipActive]} onPress={() => setCompType(t)}>
                  <Text style={[st.chipText, compType === t && st.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {compType === 'Run Race' && (
              <>
                <Text style={st.formLabel}>DISTANCE</Text>
                <View style={[st.chipRow, { marginBottom: 14 }]}>
                  {RUN_DISTANCES.map((d) => (
                    <TouchableOpacity key={d} style={[st.chip, compRunDist === d && st.chipActive]} onPress={() => setCompRunDist(d)}>
                      <Text style={[st.chipText, compRunDist === d && st.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {compRunDist === 'Custom' && (
                  <TextInput
                    style={[st.terminalInput, { marginBottom: 14 }]}
                    value={compCustomDist}
                    onChangeText={setCompCustomDist}
                    placeholder="Distance in miles (e.g. 13.1)"
                    placeholderTextColor={MUTED}
                    keyboardType="numeric"
                  />
                )}
              </>
            )}
            {compType === 'Lifting Challenge' && (
              <>
                <Text style={st.formLabel}>EXERCISE</Text>
                <TextInput
                  style={[st.terminalInput, { marginBottom: 14 }]}
                  value={compExercise}
                  onChangeText={setCompExercise}
                  placeholder="e.g. Deadlift, Bench Press..."
                  placeholderTextColor={MUTED}
                />
              </>
            )}
            <Text style={st.formLabel}>TIME WINDOW</Text>
            <View style={[st.chipRow, { marginBottom: 14 }]}>
              {TIME_WINDOWS.map((w) => (
                <TouchableOpacity key={w} style={[st.chip, compWindow === w && st.chipActive]} onPress={() => setCompWindow(w)}>
                  <Text style={[st.chipText, compWindow === w && st.chipTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={st.formLabel}>VISIBILITY</Text>
            <View style={[st.chipRow, { marginBottom: 20 }]}>
              {VISIBILITY_OPTS.map((v) => (
                <TouchableOpacity key={v} style={[st.chip, compVisibility === v && st.chipActive]} onPress={() => setCompVisibility(v)}>
                  <Text style={[st.chipText, compVisibility === v && st.chipTextActive]}>
                    {v === 'Public' ? '🌐 Public' : '🔒 Team Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.compPreviewCard}>
              <Text style={st.formLabel}>PREVIEW</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: GOLD }}>⚔️  {buildCompTitle()}</Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                Duration: {compWindow} · {compVisibility}
              </Text>
            </View>
            <GoldButton title="LAUNCH COMPETITION" onPress={createCompetition} loading={compCreating} />
            <TouchableOpacity style={st.cancelBtn} onPress={() => setCompModalVisible(false)}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* RESULT MODAL */}
      <Modal visible={resultModalVisible} animationType="slide" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={st.modalOverlay}>
          <ScrollView contentContainerStyle={st.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>RESULTS</Text>
              <TouchableOpacity onPress={() => setResultModalVisible(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedComp && (
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
                {selectedComp.title}
              </Text>
            )}
            <Text style={st.formLabel}>SUBMIT YOUR RESULT</Text>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <TextInput
                style={[st.terminalInput, { flex: 1 }]}
                value={resultValue}
                onChangeText={setResultValue}
                placeholder={selectedComp?.distance_miles ? 'Time in seconds (e.g. 1245)' : 'Weight in lbs or reps'}
                placeholderTextColor={MUTED}
                keyboardType="numeric"
              />
              <TextInput
                style={[st.terminalInput, { width: 80, marginLeft: 8, textAlign: 'center' }]}
                value={resultUnit}
                onChangeText={setResultUnit}
                placeholder="unit"
                placeholderTextColor={MUTED}
              />
            </View>
            <GoldButton title="SUBMIT RESULT" onPress={submitResult} loading={resultSubmitting} style={{ marginTop: 12, marginBottom: 20 }} />
            <Text style={st.sectionLabel}>LEADERBOARD</Text>
            {compResults.length === 0 ? (
              <Text style={[st.emptyText, { marginBottom: 20 }]}>No results yet. Be the first!</Text>
            ) : (
              compResults.map((r, i) => (
                <View key={r.id} style={st.resultRow}>
                  <Text style={[st.lbRank, { color: rankColor(i + 1) }]}>{i + 1}</Text>
                  <Text style={[st.lbName, { flex: 1, marginLeft: 8 }]}>{r.profiles?.full_name || 'Anonymous'}</Text>
                  <Text style={st.lbTokens}>{r.result_value} {r.result_unit || ''}</Text>
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* JOIN REQUEST MODAL */}
      <Modal visible={joinModalVisible} animationType="slide" transparent onRequestClose={() => setJoinModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={st.modalContainer}>
            <Text style={st.modalTitle}>REQUEST TO JOIN</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 }}>
              {joinTargetTeam?.name}
            </Text>
            <Text style={st.formLabel}>WHY DO YOU WANT TO JOIN? (optional)</Text>
            <TextInput
              style={[st.terminalInput, { height: 80, marginBottom: 12 }]}
              value={joinMessage}
              onChangeText={setJoinMessage}
              placeholder="Tell the team about yourself..."
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={3}
            />
            <Text style={st.formLabel}>YOUR LOCATION (city/state)</Text>
            <TextInput
              style={[st.terminalInput, { marginBottom: 20 }]}
              value={joinLocation}
              onChangeText={setJoinLocation}
              placeholder="e.g. Atlanta, GA"
              placeholderTextColor={MUTED}
            />
            <GoldButton title="SEND REQUEST" onPress={submitJoinRequest} loading={joinSubmitting} />
            <TouchableOpacity style={st.cancelBtn} onPress={() => setJoinModalVisible(false)}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MANAGEMENT MODAL */}
      <Modal visible={manageModalVisible} animationType="slide" transparent onRequestClose={() => setManageModalVisible(false)}>
        <View style={st.modalOverlay}>
          <ScrollView contentContainerStyle={st.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>MANAGE TEAM</Text>
              <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                <Text style={st.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={st.formLabel}>TEAM NAME</Text>
            <TextInput style={[st.terminalInput, { marginBottom: 10 }]} value={manageName} onChangeText={setManageName} placeholderTextColor={MUTED} />
            <Text style={st.formLabel}>DESCRIPTION</Text>
            <TextInput style={[st.terminalInput, { height: 72, marginBottom: 10 }]} value={manageDesc} onChangeText={setManageDesc} placeholder="Describe your team..." placeholderTextColor={MUTED} multiline numberOfLines={3} />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.formLabel}>CITY</Text>
                <TextInput style={st.terminalInput} value={manageCity} onChangeText={setManageCity} placeholder="City" placeholderTextColor={MUTED} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.formLabel}>STATE</Text>
                <TextInput style={st.terminalInput} value={manageState} onChangeText={setManageState} placeholder="ST" placeholderTextColor={MUTED} autoCapitalize="characters" maxLength={2} />
              </View>
            </View>
            <Text style={st.formLabel}>SPORT FOCUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={st.chipRow}>
                {SPORT_FOCUSES.map((s) => (
                  <TouchableOpacity key={s} style={[st.chip, manageSport === s && st.chipActive]} onPress={() => setManageSport(s)}>
                    <Text style={[st.chipText, manageSport === s && st.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[st.formLabel, { flex: 1, marginBottom: 0 }]}>MAX MEMBERS</Text>
              <TextInput style={[st.terminalInput, { width: 70, textAlign: 'center' }]} value={manageMaxMembers} onChangeText={setManageMaxMembers} keyboardType="numeric" maxLength={3} />
            </View>
            <Text style={st.formLabel}>STATUS</Text>
            <View style={st.chipRow}>
              {['open', 'closed', 'full'].map((s) => (
                <TouchableOpacity key={s} style={[st.chip, manageStatus === s && st.chipActive]} onPress={() => setManageStatus(s)}>
                  <Text style={[st.chipText, manageStatus === s && st.chipTextActive]}>{s.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <GoldButton title="SAVE CHANGES" onPress={saveTeamChanges} loading={manageSaving} style={{ marginVertical: 16 }} />
            <Text style={[st.sectionLabel, { marginBottom: 10 }]}>PENDING REQUESTS</Text>
            {manageLoading ? (
              <ActivityIndicator color={GOLD} />
            ) : pendingRequests.length === 0 ? (
              <Text style={st.emptyText}>No pending requests</Text>
            ) : (
              pendingRequests.map((req) => (
                <View key={req.id} style={st.pendingReqCard}>
                  <Text style={st.pendingReqName}>{req.profiles?.name || 'Unknown User'}</Text>
                  {(req.profiles?.city || req.profiles?.state) && (
                    <Text style={st.pendingReqLocation}>📍 {[req.profiles?.city, req.profiles?.state].filter(Boolean).join(', ')}</Text>
                  )}
                  {req.message ? <Text style={st.pendingReqMsg}>"{req.message}"</Text> : null}
                  <Text style={st.pendingReqDate}>{new Date(req.created_at).toLocaleDateString()}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity style={st.approveBtn} onPress={() => approveRequest(req)}>
                      <Text style={st.approveBtnText}>✓ APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={st.declineBtn} onPress={() => declineRequest(req)}>
                      <Text style={st.declineBtnText}>✗ DECLINE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  // ── Create Team Form (inline render) ──────────────────────────────────────
  function renderCreateForm() {
    return (
      <View style={{ marginTop: 14 }}>
        <TextInput style={st.terminalInput} value={createName} onChangeText={setCreateName} placeholder="Team name *" placeholderTextColor={MUTED} autoCapitalize="words" />
        <TextInput style={[st.terminalInput, { marginTop: 8, height: 72 }]} value={createDesc} onChangeText={setCreateDesc} placeholder="Description (optional)" placeholderTextColor={MUTED} multiline numberOfLines={3} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 }}>
          <TextInput style={[st.terminalInput, { flex: 1 }]} value={createCity} onChangeText={setCreateCity} placeholder="City" placeholderTextColor={MUTED} />
          <TextInput style={[st.terminalInput, { flex: 1 }]} value={createState} onChangeText={setCreateState} placeholder="State" placeholderTextColor={MUTED} autoCapitalize="characters" maxLength={2} />
        </View>
        <Text style={st.formLabel}>SPORT FOCUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={st.chipRow}>
            {SPORT_FOCUSES.map((s) => (
              <TouchableOpacity key={s} style={[st.chip, createSport === s && st.chipActive]} onPress={() => setCreateSport(s)}>
                <Text style={[st.chipText, createSport === s && st.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[st.formLabel, { flex: 1, marginBottom: 0 }]}>MAX MEMBERS</Text>
          <TextInput style={[st.terminalInput, { width: 60, textAlign: 'center' }]} value={createMaxMembers} onChangeText={setCreateMaxMembers} keyboardType="numeric" maxLength={3} />
        </View>
        <GoldButton title="CREATE TEAM" onPress={createTeam} loading={actionLoading} style={{ marginTop: 8 }} />
      </View>
    );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Ticker
  tickerContainer: {
    height: 32,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: GOLD,
    letterSpacing: 0.5,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Market Bell Overlay
  bellOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellEmoji: { fontSize: 72, marginBottom: 16 },
  bellText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 28,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 6,
    textShadowColor: GOLD,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  bellSub: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: MUTED,
    letterSpacing: 3,
    marginTop: 8,
  },

  // AT0M Fitness Index
  indexCard: {
    backgroundColor: SURFACE,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  indexLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: GOLD,
    letterSpacing: 3,
    marginBottom: 4,
  },
  indexRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  indexValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  indexChange: { fontSize: 16, fontWeight: '700', color: GOLD, marginLeft: 8 },
  indexSub: { fontSize: 10, color: MUTED },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: GOLD,
  },
  tabText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 1,
  },
  tabTextActive: { color: GOLD },
  tabSeparator: { height: 1, backgroundColor: '#222', marginBottom: 16 },

  // Section label
  sectionLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },

  // My Team Banner
  myTeamBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  myTeamLabel: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 2 },
  myTeamName: { fontSize: 16, fontWeight: '700', color: GOLD },
  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
  leaveBtnText: { color: MUTED, fontSize: 12, fontWeight: '600' },

  // No Team Banner
  noTeamBanner: {
    backgroundColor: SURFACE,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
    marginBottom: 14,
  },
  noTeamText: { fontSize: 13, color: MUTED, marginBottom: 10 },
  noTeamActions: { flexDirection: 'row', gap: 10 },
  noTeamCreate: {
    flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center',
    borderWidth: 1, borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.08)',
  },
  noTeamFind: {
    flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  noTeamCreateText: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  noTeamFindText: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Gainers / Losers
  gainLossRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  gainCol: { flex: 1, borderRightWidth: 1, borderRightColor: '#222', paddingRight: 8 },
  lossCol: { flex: 1, paddingLeft: 8 },
  gainLabel: { fontSize: 9, fontWeight: '700', color: GREEN, letterSpacing: 1, marginBottom: 6 },
  lossLabel: { fontSize: 9, fontWeight: '700', color: RED, letterSpacing: 1, marginBottom: 6, textAlign: 'right' },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  miniName: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10, color: '#ccc', flex: 1,
  },
  miniDelta: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10, fontWeight: '700',
  },

  // Leaderboard container
  lbContainer: {
    backgroundColor: SURFACE,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
    overflow: 'hidden',
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lbRowHighlight: {
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(201,168,76,0.06)',
    margin: 2,
    borderRadius: 4,
  },
  lbRank: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    width: 32, fontSize: 12, fontWeight: '800', textAlign: 'center',
  },
  lbAvatar: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  lbAvatarText: { fontSize: 12, fontWeight: '800' },
  lbInfo: { flex: 1, marginLeft: 8 },
  lbName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  lbTeam: { fontSize: 10, color: MUTED },
  lbRight: { alignItems: 'flex-end' },
  lbTokens: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12, fontWeight: '800',
  },
  lbChange: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
  },
  expandedRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(201,168,76,0.04)',
  },
  expandedText: { fontSize: 11, color: MUTED },
  divider: { height: 1, backgroundColor: '#1a1a1a' },

  // Competition section
  compSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  newCompBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  newCompBtnText: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Competition Card
  compCard: {
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 14,
    marginBottom: 10,
  },
  compCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compCardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  compCountdown: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13, marginBottom: 4,
  },
  compCardDesc: { fontSize: 12, color: MUTED, marginBottom: 4 },
  compCardMeta: { fontSize: 11, color: MUTED, marginBottom: 10 },
  compResultsBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(201,168,76,0.08)',
    alignSelf: 'flex-start',
  },
  compResultsBtnText: { color: GOLD, fontSize: 11, fontWeight: '700' },
  hostTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: GOLD,
  },
  hostTagText: { color: GOLD, fontSize: 9, fontWeight: '700' },

  startCompBtn: {
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(201,168,76,0.06)',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  startCompBtnText: { color: GOLD, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  // Market close
  marketCloseRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  marketCloseText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11, color: MUTED, letterSpacing: 0.5,
  },

  // Teams Tab
  teamHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 2,
  },
  teamHeaderCell: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  teamRowHighlight: {
    borderWidth: 1, borderColor: GOLD, margin: 2, borderRadius: 4,
    backgroundColor: 'rgba(201,168,76,0.05)',
  },
  teamRank: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    width: 36, fontSize: 12, fontWeight: '800',
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  teamLocation: { fontSize: 10, color: MUTED },
  teamMembers: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    width: 48, fontSize: 11, color: MUTED, textAlign: 'center',
  },
  teamTokensCol: { width: 90, alignItems: 'flex-end' },
  teamTokens: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11, fontWeight: '700', color: GOLD,
  },
  teamWeeklyChange: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10, fontWeight: '600',
  },
  manageBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
    borderWidth: 1, borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.1)',
    marginLeft: 8,
  },
  manageBtnText: { color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  // Terminal Input (Find Team)
  terminalInput: {
    backgroundColor: '#0e0e0e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
  },
  terminalInputFocused: {
    borderColor: GOLD,
  },

  // Discover Cards
  discoverCard: {
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 10,
  },
  discoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  discoverTeamName: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  discoverLocation: { fontSize: 11, color: MUTED, marginBottom: 8 },
  discoverMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sportBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 3,
    backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: GOLD,
  },
  sportBadgeText: { color: GOLD, fontSize: 10, fontWeight: '700' },
  memberCount: { fontSize: 11, color: MUTED },
  fillBarBg: { height: 2, backgroundColor: '#2a2a2a', borderRadius: 1, marginBottom: 8 },
  fillBarFg: { height: 2, backgroundColor: GOLD, borderRadius: 1 },
  discoverDesc: { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 10 },
  discoverActions: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  statusOpen: { backgroundColor: 'rgba(0,200,83,0.1)', borderWidth: 1, borderColor: GREEN },
  statusFull: { backgroundColor: 'rgba(255,23,68,0.1)', borderWidth: 1, borderColor: RED },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  requestBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4,
    borderWidth: 1, borderColor: GOLD,
  },
  requestBtnText: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  requestedText: { color: MUTED, fontSize: 11, fontWeight: '600' },
  memberBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4,
    backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 1, borderColor: GOLD,
  },
  memberBadgeText: { color: GOLD, fontSize: 10, fontWeight: '700' },

  // My Requests
  myRequestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 12,
    marginBottom: 8,
  },
  myRequestTeam: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  reqStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 8 },
  reqPending: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: GOLD },
  reqApproved: { backgroundColor: 'rgba(0,200,83,0.1)', borderWidth: 1, borderColor: GREEN },
  reqRejected: { backgroundColor: 'rgba(255,23,68,0.1)', borderWidth: 1, borderColor: RED },
  reqStatusText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  joinNowBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, backgroundColor: GOLD, marginLeft: 8 },
  joinNowText: { color: BG, fontSize: 10, fontWeight: '800' },

  // Empty
  emptyBox: {
    backgroundColor: SURFACE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#222',
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13, fontWeight: '700', color: GOLD, letterSpacing: 2,
  },
  modalClose: { fontSize: 18, color: MUTED, paddingHorizontal: 4 },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  formLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 6, marginTop: 4,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 3,
    borderWidth: 1, borderColor: '#2a2a2a', backgroundColor: '#0e0e0e',
  },
  chipActive: { borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.12)' },
  chipText: { color: MUTED, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: GOLD },
  compPreviewCard: {
    backgroundColor: '#0e0e0e',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },

  // Manage modal
  pendingReqCard: {
    backgroundColor: BG, borderRadius: 6, borderWidth: 1, borderColor: '#2a2a2a',
    padding: 14, marginBottom: 10,
  },
  pendingReqName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  pendingReqLocation: { fontSize: 11, color: MUTED, marginBottom: 4 },
  pendingReqMsg: { fontSize: 12, color: MUTED, fontStyle: 'italic', marginBottom: 4 },
  pendingReqDate: { fontSize: 10, color: MUTED },
  approveBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 4, alignItems: 'center',
    borderWidth: 1, borderColor: GREEN, backgroundColor: 'rgba(0,200,83,0.08)',
  },
  declineBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 4, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  approveBtnText: { color: GREEN, fontSize: 11, fontWeight: '700' },
  declineBtnText: { color: MUTED, fontSize: 11, fontWeight: '700' },
});
