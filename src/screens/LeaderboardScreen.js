import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const TABS = ['GLOBAL', 'TEAMS'];

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

function TeamRankRow({ rank, name, tokens }) {
  return (
    <View style={styles.rankRow}>
      <Text style={[styles.rankNum, rank <= 3 && styles.rankNumTop]}>{rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{name}</Text>
      </View>
      <Text style={styles.rankTokens}>{tokens} pts</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('GLOBAL');
  const [globalRows, setGlobalRows] = useState([]);
  const [teamRows, setTeamRows] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create/Join Team state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Global leaderboard via the view
    const { data: lb } = await supabase
      .from('leaderboard')
      .select('id, name, team_name, total_tokens')
      .limit(20);
    setGlobalRows(lb || []);

    // Teams leaderboard
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, total_tokens')
      .order('total_tokens', { ascending: false })
      .limit(10);
    setTeamRows(teams || []);

    // My team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, team_id, teams(name, total_tokens)')
      .eq('user_id', user.id)
      .single();
    setMyTeam(membership || null);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const createTeam = async () => {
    if (!teamNameInput.trim()) {
      Alert.alert('Required', 'Enter a team name.');
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Insert team
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({ name: teamNameInput.trim(), total_tokens: 0 })
      .select()
      .single();

    if (teamError) {
      Alert.alert('Error', teamError.message);
      setActionLoading(false);
      return;
    }

    // Join team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ user_id: user.id, team_id: newTeam.id, tokens_contributed: 0 });

    if (memberError) {
      Alert.alert('Error', memberError.message);
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    setShowCreateForm(false);
    setTeamNameInput('');
    Alert.alert('Team created! 🏆', `Welcome to ${newTeam.name}`);
    loadData();
  };

  const joinTeam = async () => {
    if (!teamNameInput.trim()) {
      Alert.alert('Required', 'Enter a team name.');
      return;
    }
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Find team by name
    const { data: found } = await supabase
      .from('teams')
      .select('id, name')
      .ilike('name', teamNameInput.trim())
      .limit(1)
      .single();

    if (!found) {
      Alert.alert('Not found', 'No team with that name. Check spelling or create it.');
      setActionLoading(false);
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .insert({ user_id: user.id, team_id: found.id, tokens_contributed: 0 });

    if (error) {
      Alert.alert('Error', error.message);
      setActionLoading(false);
      return;
    }

    setActionLoading(false);
    setShowJoinForm(false);
    setTeamNameInput('');
    Alert.alert('Joined! 🤝', `You're now on team ${found.name}`);
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

      {/* Team status */}
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
              onPress={() => { setShowCreateForm((v) => !v); setShowJoinForm(false); setTeamNameInput(''); }}
            >
              <Text style={styles.teamActionCreateText}>CREATE TEAM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.teamActionBtn, styles.teamActionJoin]}
              onPress={() => { setShowJoinForm((v) => !v); setShowCreateForm(false); setTeamNameInput(''); }}
            >
              <Text style={styles.teamActionJoinText}>JOIN TEAM</Text>
            </TouchableOpacity>
          </View>

          {(showCreateForm || showJoinForm) && (
            <View style={styles.teamForm}>
              <TextInput
                style={styles.teamInput}
                value={teamNameInput}
                onChangeText={setTeamNameInput}
                placeholder={showCreateForm ? 'Team name...' : 'Search team name...'}
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
              />
              <GoldButton
                title={showCreateForm ? 'CREATE' : 'JOIN'}
                onPress={showCreateForm ? createTeam : joinTeam}
                loading={actionLoading}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </Card>
      )}

      {/* Global Tab */}
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

      {/* Teams Tab */}
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
              {teamRows.map((team, i) => (
                <View key={team.id}>
                  <TeamRankRow rank={i + 1} name={team.name} tokens={team.total_tokens || 0} />
                  {i < teamRows.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

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
  tabText: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1.5 },
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
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15,
  },
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
  rankNum: {
    width: 32, fontSize: 16, fontWeight: '800', color: colors.muted, textAlign: 'center',
  },
  rankNumTop: { color: colors.gold },
  rankInfo: { flex: 1, marginLeft: 8 },
  rankName: { fontSize: 14, fontWeight: '700', color: colors.text },
  rankTeam: { fontSize: 11, color: colors.muted, marginTop: 1 },
  rankTokens: { fontSize: 14, fontWeight: '800', color: colors.gold, minWidth: 70, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border },
});
