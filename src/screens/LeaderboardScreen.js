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
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const TABS = ['GLOBAL', 'TEAMS', 'FIND TEAM 🔍'];
const SPORT_FILTERS = ['All', 'Running', 'Lifting', 'CrossFit', 'Mixed'];
const SPORT_FOCUSES = ['General', 'Running', 'Lifting', 'CrossFit', 'Mixed', 'Combat Sports'];

// ─── Rank Row Components ────────────────────────────────────────────────────

function RankRow({ rank, name, teamName, tokens, isCurrentUser }) {
  return (
    <View style={[styles.rankRow, isCurrentUser && styles.rankRowHighlight]}>
      <Text style={[styles.rankNum, rank <= 3 && styles.rankNumTop]}>{rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{name || 'Unnamed'}</Text>
        {teamName ? <Text style={styles.rankTeam}>{teamName}</Text> : null}
      </View>
      <Text style={styles.rankTokens}>{tokens} pts</Text>
    </View>
  );
}

function TeamRankRow({ rank, team, isMyTeam, onManage }) {
  return (
    <View style={[styles.rankRow, isMyTeam && styles.rankRowHighlight]}>
      <Text style={[styles.rankNum, rank <= 3 && styles.rankNumTop]}>{rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{team.name}</Text>
        {team.city ? (
          <Text style={styles.rankTeam}>📍 {team.city}{team.state ? `, ${team.state}` : ''}</Text>
        ) : null}
      </View>
      <View style={styles.teamRankRight}>
        <Text style={styles.rankTokens}>{team.total_tokens || 0} pts</Text>
        {isMyTeam && (
          <TouchableOpacity style={styles.manageBtn} onPress={onManage}>
            <Text style={styles.manageBtnText}>MANAGE</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Find Team Card ─────────────────────────────────────────────────────────

function TeamDiscoverCard({ team, memberCount, isMember, hasPendingRequest, onRequestJoin }) {
  const fillPct = team.max_members > 0 ? Math.min(memberCount / team.max_members, 1) : 0;
  const isFull = team.status === 'full' || memberCount >= (team.max_members || 10);

  return (
    <View style={styles.discoverCard}>
      <View style={styles.discoverHeader}>
        <Text style={styles.discoverTeamName}>{team.name}</Text>
        <View style={[styles.statusBadge, isFull ? styles.statusFull : styles.statusOpen]}>
          <Text style={styles.statusBadgeText}>{isFull ? 'FULL' : 'OPEN'}</Text>
        </View>
      </View>

      {(team.city || team.state) ? (
        <Text style={styles.discoverLocation}>
          📍 {[team.city, team.state].filter(Boolean).join(', ')}
        </Text>
      ) : null}

      <View style={styles.discoverMeta}>
        {team.sport_focus ? (
          <View style={styles.sportBadge}>
            <Text style={styles.sportBadgeText}>{team.sport_focus}</Text>
          </View>
        ) : null}
        <Text style={styles.memberCount}>
          {memberCount} / {team.max_members || 10} members
        </Text>
      </View>

      {/* Fill bar */}
      <View style={styles.fillBarBg}>
        <View style={[styles.fillBarFg, { width: `${fillPct * 100}%` }]} />
      </View>

      {team.description ? (
        <Text style={styles.discoverDesc} numberOfLines={2}>{team.description}</Text>
      ) : null}

      <View style={styles.discoverActions}>
        {isMember ? (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>✓ MEMBER</Text>
          </View>
        ) : hasPendingRequest ? (
          <Text style={styles.requestedText}>REQUESTED ✓</Text>
        ) : !isFull ? (
          <TouchableOpacity style={styles.requestBtn} onPress={() => onRequestJoin(team)}>
            <Text style={styles.requestBtnText}>REQUEST TO JOIN</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('GLOBAL');
  const [globalRows, setGlobalRows] = useState([]);
  const [teamRows, setTeamRows] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create Team state (enhanced)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createState, setCreateState] = useState('');
  const [createSport, setCreateSport] = useState('General');
  const [createMaxMembers, setCreateMaxMembers] = useState('10');
  const [actionLoading, setActionLoading] = useState(false);

  // Find Team state
  const [openTeams, setOpenTeams] = useState([]);
  const [findLoading, setFindLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [myMemberships, setMyMemberships] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  // Join Request Modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinTargetTeam, setJoinTargetTeam] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinLocation, setJoinLocation] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

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

  // ── Data Loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Global leaderboard
    const { data: lb } = await supabase
      .from('leaderboard')
      .select('id, name, team_name, total_tokens')
      .limit(20);
    setGlobalRows(lb || []);

    // Teams leaderboard (include new fields)
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, total_tokens, city, state, created_by, status, max_members, sport_focus')
      .order('total_tokens', { ascending: false })
      .limit(10);
    setTeamRows(teams || []);

    // My team memberships
    const { data: memberships } = await supabase
      .from('team_members')
      .select('id, team_id, is_lead, teams(id, name, total_tokens, city, state)')
      .eq('user_id', user.id);
    setMyMemberships(memberships || []);
    const primary = memberships && memberships.length > 0 ? memberships[0] : null;
    setMyTeam(primary || null);

    // My join requests
    const { data: requests } = await supabase
      .from('team_join_requests')
      .select('id, team_id, status, message, teams(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyRequests(requests || []);

    setLoading(false);
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === 'FIND TEAM 🔍') loadOpenTeams();
  }, [activeTab, loadOpenTeams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (activeTab === 'FIND TEAM 🔍') await loadOpenTeams();
    setRefreshing(false);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────

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

  // ── Create Team ───────────────────────────────────────────────────────────

  const createTeam = async () => {
    if (!createName.trim()) {
      Alert.alert('Required', 'Enter a team name.');
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: createName.trim(),
        description: createDesc.trim() || null,
        city: createCity.trim() || null,
        state: createState.trim() || null,
        sport_focus: createSport.toLowerCase(),
        max_members: parseInt(createMaxMembers, 10) || 10,
        status: 'open',
        created_by: user.id,
        total_tokens: 0,
      })
      .select()
      .single();

    if (teamError) {
      Alert.alert('Error', teamError.message);
      setActionLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ user_id: user.id, team_id: newTeam.id, tokens_contributed: 0, is_lead: true });

    if (memberError) {
      Alert.alert('Error', memberError.message);
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    setShowCreateForm(false);
    setCreateName(''); setCreateDesc(''); setCreateCity(''); setCreateState('');
    setCreateSport('General'); setCreateMaxMembers('10');
    Alert.alert('Team created! 🏆', `Welcome to ${newTeam.name}`);
    loadData();
  };

  const leaveTeam = () => {
    Alert.alert('Leave Team', `Leave ${myTeam?.teams?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('team_members').delete().eq('id', myTeam.id);
          setMyTeam(null);
          loadData();
        },
      },
    ]);
  };

  // ── Join Request ──────────────────────────────────────────────────────────

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

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setJoinModalVisible(false);
      Alert.alert('Request sent! ✅', `Your request to join ${joinTargetTeam.name} has been sent.`);
      await loadData();
    }
    setJoinSubmitting(false);
  };

  const acceptApprovedRequest = async (request) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Check not already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', request.team_id)
      .single();

    if (!existing) {
      const { error } = await supabase.from('team_members').insert({
        user_id: user.id,
        team_id: request.team_id,
        tokens_contributed: 0,
        is_lead: false,
      });
      if (error) { Alert.alert('Error', error.message); return; }
    }

    // Mark request as consumed (delete or keep — we'll update responded_at)
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

    // Load pending requests
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
    // Add to team_members
    const { error: memberErr } = await supabase.from('team_members').upsert({
      user_id: req.user_id,
      team_id: manageTeam.id,
      tokens_contributed: 0,
      is_lead: false,
    }, { onConflict: 'user_id,team_id' });

    if (memberErr) { Alert.alert('Error', memberErr.message); return; }

    // Update request status
    await supabase.from('team_join_requests').update({
      status: 'approved',
      responded_at: new Date().toISOString(),
    }).eq('id', req.id);

    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    Alert.alert('Approved! ✅', `${req.profiles?.name || 'User'} has been added to your team.`);
    loadData();
  };

  const declineRequest = async (req) => {
    await supabase.from('team_join_requests').update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
    }).eq('id', req.id);

    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team status banner (show on GLOBAL + TEAMS tabs) */}
      {activeTab !== 'FIND TEAM 🔍' && (
        <>
          {myTeam ? (
            <Card style={styles.myTeamCard}>
              <View style={styles.myTeamRow}>
                <View>
                  <Text style={styles.myTeamLabel}>YOUR TEAM</Text>
                  <Text style={styles.myTeamName}>{myTeam.teams?.name}</Text>
                </View>
                <TouchableOpacity style={styles.leaveBtn} onPress={leaveTeam}>
                  <Text style={styles.leaveBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <Card style={styles.noTeamCard}>
              <Text style={styles.noTeamText}>You're not on a team yet.</Text>
              <View style={styles.teamActionRow}>
                <TouchableOpacity
                  style={[styles.teamActionBtn, styles.teamActionCreate]}
                  onPress={() => setShowCreateForm((v) => !v)}
                >
                  <Text style={styles.teamActionCreateText}>CREATE TEAM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.teamActionBtn, styles.teamActionJoin]}
                  onPress={() => setActiveTab('FIND TEAM 🔍')}
                >
                  <Text style={styles.teamActionJoinText}>FIND A TEAM</Text>
                </TouchableOpacity>
              </View>

              {showCreateForm && (
                <View style={styles.teamForm}>
                  <TextInput
                    style={styles.teamInput}
                    value={createName}
                    onChangeText={setCreateName}
                    placeholder="Team name *"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.teamInput, { marginTop: 8, height: 72 }]}
                    value={createDesc}
                    onChangeText={setCreateDesc}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.rowInputs}>
                    <TextInput
                      style={[styles.teamInput, { flex: 1 }]}
                      value={createCity}
                      onChangeText={setCreateCity}
                      placeholder="City"
                      placeholderTextColor={colors.muted}
                    />
                    <TextInput
                      style={[styles.teamInput, { flex: 1, marginLeft: 8 }]}
                      value={createState}
                      onChangeText={setCreateState}
                      placeholder="State"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.formLabel}>SPORT FOCUS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    <View style={styles.chipRow}>
                      {SPORT_FOCUSES.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.chip, createSport === s && styles.chipActive]}
                          onPress={() => setCreateSport(s)}
                        >
                          <Text style={[styles.chipText, createSport === s && styles.chipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={styles.rowInputs}>
                    <Text style={[styles.formLabel, { flex: 1 }]}>MAX MEMBERS</Text>
                    <TextInput
                      style={[styles.teamInput, { width: 60, textAlign: 'center' }]}
                      value={createMaxMembers}
                      onChangeText={setCreateMaxMembers}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <GoldButton
                    title="CREATE TEAM"
                    onPress={createTeam}
                    loading={actionLoading}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── GLOBAL TAB ── */}
      {activeTab === 'GLOBAL' && (
        <>
          <Text style={styles.sectionLabel}>TOP 20 OPERATORS</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading rankings...</Text>
          ) : globalRows.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No rankings yet. Start training to earn points!</Text>
            </Card>
          ) : (
            <Card>
              {globalRows.map((row, i) => (
                <View key={row.id}>
                  <RankRow
                    rank={i + 1}
                    name={row.name}
                    teamName={row.team_name}
                    tokens={row.total_tokens}
                    isCurrentUser={row.id === currentUserId}
                  />
                  {i < globalRows.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ── TEAMS TAB ── */}
      {activeTab === 'TEAMS' && (
        <>
          <Text style={styles.sectionLabel}>TOP TEAMS</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading teams...</Text>
          ) : teamRows.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No teams yet. Create one above!</Text>
            </Card>
          ) : (
            <Card>
              {teamRows.map((team, i) => {
                const isMyTeam = myTeamIds.includes(team.id);
                const isCreator = team.created_by === currentUserId;
                return (
                  <View key={team.id}>
                    <TeamRankRow
                      rank={i + 1}
                      team={team}
                      isMyTeam={isMyTeam}
                      onManage={isCreator ? () => openManageModal(team) : undefined}
                    />
                    {i < teamRows.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </Card>
          )}
        </>
      )}

      {/* ── FIND TEAM TAB ── */}
      {activeTab === 'FIND TEAM 🔍' && (
        <>
          <Text style={styles.sectionLabel}>BROWSE OPEN TEAMS</Text>

          {/* Search bar */}
          <TextInput
            style={[styles.teamInput, { marginBottom: 10 }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by city, state, or team name..."
            placeholderTextColor={colors.muted}
          />

          {/* Sport filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.chipRow}>
              {SPORT_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, sportFilter === s && styles.chipActive]}
                  onPress={() => setSportFilter(s)}
                >
                  <Text style={[styles.chipText, sportFilter === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {findLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 30 }} />
          ) : filteredTeams.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No teams found. Try a different search.</Text>
            </Card>
          ) : (
            filteredTeams.map((team) => {
              const memberCount = getMemberCount(team);
              return (
                <TeamDiscoverCard
                  key={team.id}
                  team={team}
                  memberCount={memberCount}
                  isMember={myTeamIds.includes(team.id)}
                  hasPendingRequest={
                    myRequestMap[team.id]?.status === 'pending'
                  }
                  onRequestJoin={openJoinModal}
                />
              );
            })
          )}

          {/* My Requests section */}
          {myRequests.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>MY REQUESTS</Text>
              {myRequests.map((req) => (
                <View key={req.id} style={styles.myRequestRow}>
                  <View style={styles.myRequestLeft}>
                    <Text style={styles.myRequestTeam}>{req.teams?.name || 'Unknown Team'}</Text>
                  </View>
                  <View style={styles.myRequestRight}>
                    <View style={[
                      styles.reqStatusBadge,
                      req.status === 'approved' && styles.reqApproved,
                      req.status === 'rejected' && styles.reqRejected,
                      req.status === 'pending' && styles.reqPending,
                    ]}>
                      <Text style={styles.reqStatusText}>{req.status.toUpperCase()}</Text>
                    </View>
                    {req.status === 'approved' && !myTeamIds.includes(req.team_id) && (
                      <TouchableOpacity
                        style={styles.joinNowBtn}
                        onPress={() => acceptApprovedRequest(req)}
                      >
                        <Text style={styles.joinNowText}>JOIN NOW</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <View style={{ height: 40 }} />

      {/* ── JOIN REQUEST MODAL ── */}
      <Modal
        visible={joinModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Request to Join</Text>
            <Text style={styles.modalTeamName}>{joinTargetTeam?.name}</Text>

            <Text style={styles.formLabel}>WHY DO YOU WANT TO JOIN? (optional)</Text>
            <TextInput
              style={[styles.teamInput, { height: 80, marginBottom: 12 }]}
              value={joinMessage}
              onChangeText={setJoinMessage}
              placeholder="Tell the team about yourself..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>YOUR LOCATION (city/state)</Text>
            <TextInput
              style={[styles.teamInput, { marginBottom: 20 }]}
              value={joinLocation}
              onChangeText={setJoinLocation}
              placeholder="e.g. Atlanta, GA"
              placeholderTextColor={colors.muted}
            />

            <GoldButton
              title="SEND REQUEST"
              onPress={submitJoinRequest}
              loading={joinSubmitting}
            />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setJoinModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MANAGEMENT MODAL ── */}
      <Modal
        visible={manageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setManageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MANAGE TEAM</Text>
              <TouchableOpacity onPress={() => setManageModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>TEAM NAME</Text>
            <TextInput
              style={[styles.teamInput, { marginBottom: 10 }]}
              value={manageName}
              onChangeText={setManageName}
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput
              style={[styles.teamInput, { height: 72, marginBottom: 10 }]}
              value={manageDesc}
              onChangeText={setManageDesc}
              placeholder="Describe your team..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>CITY</Text>
                <TextInput
                  style={styles.teamInput}
                  value={manageCity}
                  onChangeText={setManageCity}
                  placeholder="City"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formLabel}>STATE</Text>
                <TextInput
                  style={styles.teamInput}
                  value={manageState}
                  onChangeText={setManageState}
                  placeholder="ST"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>

            <Text style={[styles.formLabel, { marginTop: 12 }]}>SPORT FOCUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.chipRow}>
                {SPORT_FOCUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, manageSport === s && styles.chipActive]}
                    onPress={() => setManageSport(s)}
                  >
                    <Text style={[styles.chipText, manageSport === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.rowInputs, { alignItems: 'center', marginBottom: 10 }]}>
              <Text style={[styles.formLabel, { flex: 1, marginBottom: 0 }]}>MAX MEMBERS</Text>
              <TextInput
                style={[styles.teamInput, { width: 70, textAlign: 'center' }]}
                value={manageMaxMembers}
                onChangeText={setManageMaxMembers}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <Text style={styles.formLabel}>STATUS</Text>
            <View style={styles.chipRow}>
              {['open', 'closed', 'full'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, manageStatus === s && styles.chipActive]}
                  onPress={() => setManageStatus(s)}
                >
                  <Text style={[styles.chipText, manageStatus === s && styles.chipTextActive]}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <GoldButton
              title="SAVE CHANGES"
              onPress={saveTeamChanges}
              loading={manageSaving}
              style={{ marginVertical: 16 }}
            />

            {/* Pending Requests */}
            <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>PENDING REQUESTS</Text>
            {manageLoading ? (
              <ActivityIndicator color={colors.gold} />
            ) : pendingRequests.length === 0 ? (
              <Text style={styles.emptyText}>No pending requests</Text>
            ) : (
              pendingRequests.map((req) => (
                <View key={req.id} style={styles.pendingReqCard}>
                  <Text style={styles.pendingReqName}>
                    {req.profiles?.name || 'Unknown User'}
                  </Text>
                  {(req.profiles?.city || req.profiles?.state) && (
                    <Text style={styles.pendingReqLocation}>
                      📍 {[req.profiles?.city, req.profiles?.state].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {req.message ? (
                    <Text style={styles.pendingReqMsg}>"{req.message}"</Text>
                  ) : null}
                  <Text style={styles.pendingReqDate}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </Text>
                  <View style={styles.reqActionRow}>
                    <TouchableOpacity
                      style={[styles.reqActionBtn, styles.reqApproveBtn]}
                      onPress={() => approveRequest(req)}
                    >
                      <Text style={styles.reqApproveBtnText}>✓ APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reqActionBtn, styles.reqDeclineBtn]}
                      onPress={() => declineRequest(req)}
                    >
                      <Text style={styles.reqDeclineBtnText}>✗ DECLINE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(201,168,76,0.15)' },
  tabText: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  tabTextActive: { color: colors.gold },

  myTeamCard: { marginBottom: 20 },
  myTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myTeamLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1.5, marginBottom: 4 },
  myTeamName: { fontSize: 18, fontWeight: '700', color: colors.gold },
  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  leaveBtnText: { color: colors.muted, fontSize: 12, fontWeight: '600' },

  noTeamCard: { marginBottom: 20 },
  noTeamText: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  teamActionRow: { flexDirection: 'row', gap: 10 },
  teamActionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  teamActionCreate: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.1)' },
  teamActionJoin: { borderColor: colors.border },
  teamActionCreateText: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  teamActionJoinText: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  teamForm: { marginTop: 14 },
  teamInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  rowInputs: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 4,
  },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.gold },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginBottom: 10, marginTop: 4,
  },
  loadingText: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
  },
  rankRowHighlight: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  rankNum: { width: 32, fontSize: 16, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  rankNumTop: { color: colors.gold },
  rankInfo: { flex: 1, marginLeft: 8 },
  rankName: { fontSize: 14, fontWeight: '700', color: colors.text },
  rankTeam: { fontSize: 11, color: colors.muted, marginTop: 1 },
  rankTokens: { fontSize: 14, fontWeight: '800', color: colors.gold, minWidth: 70, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },

  teamRankRight: { alignItems: 'flex-end', gap: 4 },
  manageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  manageBtnText: { color: colors.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Discover cards
  discoverCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  discoverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  discoverTeamName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  discoverLocation: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  discoverMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  sportBadgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  memberCount: { fontSize: 12, color: colors.muted },
  fillBarBg: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 8 },
  fillBarFg: { height: 4, backgroundColor: colors.gold, borderRadius: 2 },
  discoverDesc: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 10 },
  discoverActions: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusOpen: { backgroundColor: 'rgba(76,201,112,0.15)', borderWidth: 1, borderColor: '#4CC970' },
  statusFull: { backgroundColor: 'rgba(201,76,76,0.15)', borderWidth: 1, borderColor: '#C94C4C' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  requestBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  requestBtnText: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  requestedText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  memberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  memberBadgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },

  // My requests
  myRequestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  myRequestLeft: { flex: 1 },
  myRequestTeam: { fontSize: 14, fontWeight: '700', color: colors.text },
  myRequestRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reqPending: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 1, borderColor: colors.gold },
  reqApproved: { backgroundColor: 'rgba(76,201,112,0.15)', borderWidth: 1, borderColor: '#4CC970' },
  reqRejected: { backgroundColor: 'rgba(201,76,76,0.15)', borderWidth: 1, borderColor: '#C94C4C' },
  reqStatusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  joinNowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.gold,
  },
  joinNowText: { color: colors.background, fontSize: 11, fontWeight: '700' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: colors.gold, letterSpacing: 2 },
  modalTeamName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalClose: { fontSize: 18, color: colors.muted, paddingHorizontal: 4 },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },

  // Pending request cards in manage modal
  pendingReqCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  pendingReqName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  pendingReqLocation: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  pendingReqMsg: { fontSize: 13, color: colors.muted, fontStyle: 'italic', marginBottom: 4 },
  pendingReqDate: { fontSize: 11, color: colors.muted, marginBottom: 10 },
  reqActionRow: { flexDirection: 'row', gap: 8 },
  reqActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  reqApproveBtn: { borderColor: '#4CC970', backgroundColor: 'rgba(76,201,112,0.1)' },
  reqDeclineBtn: { borderColor: colors.border },
  reqApproveBtnText: { color: '#4CC970', fontSize: 12, fontWeight: '700' },
  reqDeclineBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
});
