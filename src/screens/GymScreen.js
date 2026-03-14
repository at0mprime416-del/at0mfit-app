import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const GYM_TABS = ['DISCOVER', 'MY GYM', 'EVENTS'];
const FILTER_CHIPS = ['All', 'Premium', 'Verified'];
const GYM_INNER_TABS = ['Events', 'Merch', 'Members'];

// ─── Gym Card ────────────────────────────────────────────────────────────────

function GymCard({ gym, isMember, onFollow, currentUserId }) {
  const isOwner = gym.created_by === currentUserId;
  return (
    <View style={styles.gymCard}>
      <View style={styles.gymCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.gymNameRow}>
            <Text style={styles.gymCardName}>{gym.name}</Text>
            {gym.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ VERIFIED</Text>
              </View>
            )}
          </View>
          {(gym.city || gym.state) && (
            <Text style={styles.gymCardLocation}>
              📍 {[gym.city, gym.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        {gym.subscription_tier === 'premium' && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        )}
      </View>

      <Text style={styles.gymCardMeta}>
        {gym.total_members || 0} members
      </Text>

      {gym.description ? (
        <Text style={styles.gymCardDesc} numberOfLines={2}>{gym.description}</Text>
      ) : null}

      <View style={styles.gymCardActions}>
        {isOwner ? (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>⚙ OWNER</Text>
          </View>
        ) : isMember ? (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>MEMBER ✓</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.followBtn} onPress={() => onFollow(gym)}>
            <Text style={styles.followBtnText}>FOLLOW</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Event Card (mini) ───────────────────────────────────────────────────────

function EventMiniCard({ event }) {
  const d = new Date(event.event_date);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const typeEmoji = {
    group_run: '🏃',
    group_workout: '🏋️',
    competition: '🏆',
    open_competition: '⚔️',
  }[event.event_type] || '📅';

  return (
    <View style={styles.eventMiniCard}>
      <Text style={styles.eventMiniEmoji}>{typeEmoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventMiniTitle}>{event.title}</Text>
        <Text style={styles.eventMiniDate}>{dateStr} · {timeStr}</Text>
        {event.location_name && (
          <Text style={styles.eventMiniLocation}>{event.location_name}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GymScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('DISCOVER');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Discover
  const [gyms, setGyms] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState('All');
  const [myMemberships, setMyMemberships] = useState([]);

  // My Gym
  const [myGym, setMyGym] = useState(null); // the gym the user owns or primarily follows
  const [myGymLoading, setMyGymLoading] = useState(true);
  const [gymInnerTab, setGymInnerTab] = useState('Events');
  const [gymEvents, setGymEvents] = useState([]);
  const [gymMerch, setGymMerch] = useState([]);
  const [gymMembers, setGymMembers] = useState([]);
  const [gymSubLoading, setGymSubLoading] = useState(false);

  // My Gym Events tab
  const [myGymEvents, setMyGymEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Create Gym
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createWebsite, setCreateWebsite] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createState, setCreateState] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Manage Gym Modal
  const [manageVisible, setManageVisible] = useState(false);
  const [manageName, setManageName] = useState('');
  const [manageDesc, setManageDesc] = useState('');
  const [manageWebsite, setManageWebsite] = useState('');
  const [manageCity, setManageCity] = useState('');
  const [manageState, setManageState] = useState('');
  const [manageTier, setManageTier] = useState('basic');
  const [manageSaving, setManageSaving] = useState(false);

  // Create Event Modal
  const [createEventVisible, setCreateEventVisible] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evType, setEvType] = useState('group_workout');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evLocation, setEvLocation] = useState('');
  const [evCity, setEvCity] = useState('');
  const [evState, setEvState] = useState('');
  const [evDistance, setEvDistance] = useState('');
  const [evMaxPax, setEvMaxPax] = useState('50');
  const [evPublic, setEvPublic] = useState(true);
  const [evCreating, setEvCreating] = useState(false);

  // Add Merch Modal
  const [addMerchVisible, setAddMerchVisible] = useState(false);
  const [mName, setMName] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mPrice, setMPrice] = useState('');
  const [mUrl, setMUrl] = useState('');
  const [mSaving, setMSaving] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Load all gyms
    const { data: allGyms } = await supabase
      .from('gyms')
      .select('*')
      .order('total_members', { ascending: false });
    setGyms(allGyms || []);
    setDiscoverLoading(false);

    // Load memberships
    const { data: memberships } = await supabase
      .from('gym_members')
      .select('gym_id, role, gyms(*)')
      .eq('user_id', user.id);
    setMyMemberships(memberships || []);

    // Determine my primary gym (owned first, then first followed)
    const owned = (memberships || []).find((m) => m.role === 'owner');
    const primary = owned || (memberships && memberships[0]);
    setMyGym(primary?.gyms || null);
    setMyGymLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadGymDetails = useCallback(async (gymId) => {
    setGymSubLoading(true);
    const [evRes, merRes, memRes] = await Promise.all([
      supabase.from('events').select('*').eq('host_id', gymId).eq('host_type', 'gym').gte('event_date', new Date().toISOString()).order('event_date'),
      supabase.from('gym_merch').select('*').eq('gym_id', gymId).eq('available', true),
      supabase.from('gym_members').select('*, profiles(full_name, city, state)').eq('gym_id', gymId).limit(30),
    ]);
    setGymEvents(evRes.data || []);
    setGymMerch(merRes.data || []);
    setGymMembers(memRes.data || []);
    setGymSubLoading(false);
  }, []);

  useEffect(() => {
    if (myGym) loadGymDetails(myGym.id);
  }, [myGym, loadGymDetails]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const memberGymIds = myMemberships.map((m) => m.gym_id);

  const filteredGyms = gyms.filter((g) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || g.name?.toLowerCase().includes(q) || g.city?.toLowerCase().includes(q) || g.state?.toLowerCase().includes(q);
    const matchFilter =
      filterChip === 'All' ||
      (filterChip === 'Premium' && g.subscription_tier === 'premium') ||
      (filterChip === 'Verified' && g.verified);
    return matchSearch && matchFilter;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const followGym = async (gym) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('gym_members').insert({
      gym_id: gym.id,
      user_id: user.id,
      role: 'member',
    });
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Followed! 🏢', `You're now following ${gym.name}`);
    loadAll();
  };

  const createGym = async () => {
    if (!createName.trim()) { Alert.alert('Required', 'Gym name is required.'); return; }
    setCreateLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newGym, error: gymErr } = await supabase.from('gyms').insert({
      name: createName.trim(),
      description: createDesc.trim() || null,
      website: createWebsite.trim() || null,
      city: createCity.trim() || null,
      state: createState.trim() || null,
      created_by: user.id,
      total_members: 1,
    }).select().single();

    if (gymErr) { Alert.alert('Error', gymErr.message); setCreateLoading(false); return; }

    await supabase.from('gym_members').insert({
      gym_id: newGym.id,
      user_id: user.id,
      role: 'owner',
    });

    setCreateLoading(false);
    setShowCreateForm(false);
    setCreateName(''); setCreateDesc(''); setCreateWebsite(''); setCreateCity(''); setCreateState('');
    Alert.alert('Gym created! 🏢', `${newGym.name} is live.`);
    loadAll();
  };

  const openManage = () => {
    if (!myGym) return;
    setManageName(myGym.name || '');
    setManageDesc(myGym.description || '');
    setManageWebsite(myGym.website || '');
    setManageCity(myGym.city || '');
    setManageState(myGym.state || '');
    setManageTier(myGym.subscription_tier || 'basic');
    setManageVisible(true);
  };

  const saveGym = async () => {
    if (!manageName.trim()) { Alert.alert('Required', 'Gym name cannot be empty.'); return; }
    setManageSaving(true);
    const { error } = await supabase.from('gyms').update({
      name: manageName.trim(),
      description: manageDesc.trim() || null,
      website: manageWebsite.trim() || null,
      city: manageCity.trim() || null,
      state: manageState.trim() || null,
      subscription_tier: manageTier,
    }).eq('id', myGym.id);
    setManageSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved! ✅', 'Gym info updated.');
    setManageVisible(false);
    loadAll();
  };

  const createEvent = async () => {
    if (!evTitle.trim() || !evDate.trim()) { Alert.alert('Required', 'Title and date are required.'); return; }
    setEvCreating(true);
    const { data: { user } } = await supabase.auth.getUser();

    const dateTimeStr = evTime.trim() ? `${evDate.trim()}T${evTime.trim()}:00` : `${evDate.trim()}T08:00:00`;

    const { error } = await supabase.from('events').insert({
      title: evTitle.trim(),
      description: evDesc.trim() || null,
      event_type: evType,
      host_type: 'gym',
      host_id: myGym.id,
      hosted_by: user.id,
      event_date: dateTimeStr,
      location_name: evLocation.trim() || null,
      city: evCity.trim() || null,
      state: evState.trim() || null,
      distance_miles: evDistance ? parseFloat(evDistance) : null,
      max_participants: parseInt(evMaxPax, 10) || 50,
      is_public: evPublic,
      status: 'upcoming',
    });

    setEvCreating(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Event created! 🎉', evTitle.trim());
    setCreateEventVisible(false);
    setEvTitle(''); setEvDesc(''); setEvDate(''); setEvTime(''); setEvLocation('');
    setEvCity(''); setEvState(''); setEvDistance(''); setEvMaxPax('50'); setEvPublic(true);
    setEvType('group_workout');
    if (myGym) loadGymDetails(myGym.id);
  };

  const addMerch = async () => {
    if (!mName.trim()) { Alert.alert('Required', 'Item name is required.'); return; }
    setMSaving(true);
    const { error } = await supabase.from('gym_merch').insert({
      gym_id: myGym.id,
      name: mName.trim(),
      description: mDesc.trim() || null,
      price_usd: mPrice ? parseFloat(mPrice) : null,
      purchase_url: mUrl.trim() || null,
      available: true,
    });
    setMSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Added! ✅', `${mName.trim()} listed in your shop.`);
    setAddMerchVisible(false);
    setMName(''); setMDesc(''); setMPrice(''); setMUrl('');
    if (myGym) loadGymDetails(myGym.id);
  };

  const isGymOwner = myGym && myGym.created_by === currentUserId;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Outer tabs */}
      <View style={styles.outerTabs}>
        {GYM_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.outerTab, activeTab === t && styles.outerTabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.outerTabText, activeTab === t && styles.outerTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── DISCOVER ── */}
      {activeTab === 'DISCOVER' && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find gyms near you..."
            placeholderTextColor={colors.muted}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={styles.chipRow}>
              {FILTER_CHIPS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, filterChip === c && styles.chipActive]}
                  onPress={() => setFilterChip(c)}
                >
                  <Text style={[styles.chipText, filterChip === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {discoverLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 30 }} />
          ) : filteredGyms.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No gyms found. Be the first to create one!</Text>
            </Card>
          ) : (
            filteredGyms.map((gym) => (
              <GymCard
                key={gym.id}
                gym={gym}
                isMember={memberGymIds.includes(gym.id)}
                onFollow={followGym}
                currentUserId={currentUserId}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── MY GYM ── */}
      {activeTab === 'MY GYM' && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          {myGymLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : !myGym ? (
            /* No gym — create prompt */
            <View style={styles.noGymContainer}>
              <Text style={styles.noGymTitle}>No Gym Yet</Text>
              <Text style={styles.noGymSub}>
                Create your gym to host events, showcase merch, and build your community.
              </Text>
              <GoldButton
                title="CREATE A GYM"
                onPress={() => setShowCreateForm((v) => !v)}
                style={{ marginTop: 20 }}
              />
              {showCreateForm && (
                <View style={styles.createForm}>
                  <Text style={styles.formLabel}>GYM NAME *</Text>
                  <TextInput style={styles.input} value={createName} onChangeText={setCreateName} placeholder="e.g. Iron Wolf Athletics" placeholderTextColor={colors.muted} />
                  <Text style={styles.formLabel}>DESCRIPTION</Text>
                  <TextInput style={[styles.input, { height: 72 }]} value={createDesc} onChangeText={setCreateDesc} placeholder="What's your gym about?" placeholderTextColor={colors.muted} multiline />
                  <Text style={styles.formLabel}>WEBSITE</Text>
                  <TextInput style={styles.input} value={createWebsite} onChangeText={setCreateWebsite} placeholder="https://..." placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />
                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>CITY</Text>
                      <TextInput style={styles.input} value={createCity} onChangeText={setCreateCity} placeholder="City" placeholderTextColor={colors.muted} />
                    </View>
                    <View style={{ width: 80, marginLeft: 8 }}>
                      <Text style={styles.formLabel}>STATE</Text>
                      <TextInput style={styles.input} value={createState} onChangeText={setCreateState} placeholder="GA" placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={2} />
                    </View>
                  </View>
                  <GoldButton title="CREATE GYM" onPress={createGym} loading={createLoading} style={{ marginTop: 12 }} />
                </View>
              )}
            </View>
          ) : (
            /* Gym profile */
            <>
              {/* Cover / header */}
              <View style={styles.gymCoverPlaceholder}>
                <View style={styles.gymLogoPH}>
                  <Text style={styles.gymLogoInitial}>{myGym.name?.charAt(0) || '?'}</Text>
                </View>
              </View>

              <View style={styles.gymProfileHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.gymNameRow}>
                    <Text style={styles.gymProfileName}>{myGym.name}</Text>
                    {myGym.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ VERIFIED</Text>
                      </View>
                    )}
                    {myGym.subscription_tier === 'premium' && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                      </View>
                    )}
                  </View>
                  {(myGym.city || myGym.state) && (
                    <Text style={styles.gymProfileMeta}>
                      📍 {[myGym.city, myGym.state].filter(Boolean).join(', ')} · {myGym.total_members || 0} members
                    </Text>
                  )}
                  {myGym.website && (
                    <TouchableOpacity onPress={() => Linking.openURL(myGym.website)}>
                      <Text style={styles.gymWebsiteLink}>🔗 {myGym.website}</Text>
                    </TouchableOpacity>
                  )}
                  {myGym.description && (
                    <Text style={styles.gymProfileDesc}>{myGym.description}</Text>
                  )}
                </View>
              </View>

              {isGymOwner && (
                <View style={styles.ownerActions}>
                  <TouchableOpacity style={styles.manageGymBtn} onPress={openManage}>
                    <Text style={styles.manageGymBtnText}>⚙ MANAGE GYM</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Inner tabs */}
              <View style={styles.innerTabs}>
                {GYM_INNER_TABS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.innerTab, gymInnerTab === t && styles.innerTabActive]}
                    onPress={() => setGymInnerTab(t)}
                  >
                    <Text style={[styles.innerTabText, gymInnerTab === t && styles.innerTabTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {gymSubLoading ? (
                <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
              ) : (
                <>
                  {/* Events sub-tab */}
                  {gymInnerTab === 'Events' && (
                    <>
                      {isGymOwner && (
                        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateEventVisible(true)}>
                          <Text style={styles.addBtnText}>+ CREATE EVENT</Text>
                        </TouchableOpacity>
                      )}
                      {gymEvents.length === 0 ? (
                        <Card style={styles.emptyCard}>
                          <Text style={styles.emptyText}>No upcoming events</Text>
                        </Card>
                      ) : (
                        gymEvents.map((ev) => <EventMiniCard key={ev.id} event={ev} />)
                      )}
                    </>
                  )}

                  {/* Merch sub-tab */}
                  {gymInnerTab === 'Merch' && (
                    <>
                      {isGymOwner && (
                        <TouchableOpacity style={styles.addBtn} onPress={() => setAddMerchVisible(true)}>
                          <Text style={styles.addBtnText}>+ ADD MERCH</Text>
                        </TouchableOpacity>
                      )}
                      {gymMerch.length === 0 ? (
                        <Card style={styles.emptyCard}>
                          <Text style={styles.emptyText}>No merch listed yet</Text>
                        </Card>
                      ) : (
                        <View style={styles.merchGrid}>
                          {gymMerch.map((item) => (
                            <View key={item.id} style={styles.merchItem}>
                              <View style={styles.merchImgPH}>
                                <Text style={{ fontSize: 28 }}>👕</Text>
                              </View>
                              <Text style={styles.merchName} numberOfLines={1}>{item.name}</Text>
                              {item.price_usd && (
                                <Text style={styles.merchPrice}>${item.price_usd}</Text>
                              )}
                              <TouchableOpacity
                                style={styles.buyBtn}
                                onPress={() => {
                                  if (item.purchase_url) {
                                    Linking.openURL(item.purchase_url);
                                  } else {
                                    Alert.alert('Coming soon', 'Purchase link not set up yet.');
                                  }
                                }}
                              >
                                <Text style={styles.buyBtnText}>BUY</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* Members sub-tab */}
                  {gymInnerTab === 'Members' && (
                    <>
                      {gymMembers.length === 0 ? (
                        <Card style={styles.emptyCard}>
                          <Text style={styles.emptyText}>No members yet</Text>
                        </Card>
                      ) : (
                        gymMembers.map((m) => (
                          <View key={m.id} style={styles.memberRow}>
                            <View style={styles.memberAvatar}>
                              <Text style={styles.memberAvatarText}>{(m.profiles?.full_name || 'U').charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{m.profiles?.full_name || 'Unknown'}</Text>
                              {(m.profiles?.city || m.profiles?.state) && (
                                <Text style={styles.memberLocation}>
                                  📍 {[m.profiles?.city, m.profiles?.state].filter(Boolean).join(', ')}
                                </Text>
                              )}
                            </View>
                            {m.role !== 'member' && (
                              <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>{m.role.toUpperCase()}</Text>
                              </View>
                            )}
                          </View>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* ── EVENTS (gym's events feed) ── */}
      {activeTab === 'EVENTS' && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          <Text style={styles.sectionLabel}>UPCOMING GYM EVENTS</Text>
          {!myGym ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Follow a gym to see their events here</Text>
            </Card>
          ) : gymSubLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 30 }} />
          ) : gymEvents.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming events from your gym</Text>
            </Card>
          ) : (
            gymEvents.map((ev) => <EventMiniCard key={ev.id} event={ev} />)
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ─── MANAGE GYM MODAL ─── */}
      <Modal
        visible={manageVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setManageVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MANAGE GYM</Text>
              <TouchableOpacity onPress={() => setManageVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>GYM NAME</Text>
            <TextInput style={[styles.input, { marginBottom: 10 }]} value={manageName} onChangeText={setManageName} placeholderTextColor={colors.muted} />

            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, { height: 72, marginBottom: 10 }]} value={manageDesc} onChangeText={setManageDesc} placeholder="Describe your gym..." placeholderTextColor={colors.muted} multiline />

            <Text style={styles.formLabel}>WEBSITE</Text>
            <TextInput style={[styles.input, { marginBottom: 10 }]} value={manageWebsite} onChangeText={setManageWebsite} placeholder="https://..." placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>CITY</Text>
                <TextInput style={styles.input} value={manageCity} onChangeText={setManageCity} placeholderTextColor={colors.muted} />
              </View>
              <View style={{ width: 80, marginLeft: 8 }}>
                <Text style={styles.formLabel}>STATE</Text>
                <TextInput style={styles.input} value={manageState} onChangeText={setManageState} autoCapitalize="characters" maxLength={2} placeholderTextColor={colors.muted} />
              </View>
            </View>

            <Text style={[styles.formLabel, { marginTop: 14 }]}>SUBSCRIPTION TIER</Text>
            <View style={styles.chipRow}>
              {['basic', 'premium'].map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[styles.chip, manageTier === tier && styles.chipActive]}
                  onPress={() => setManageTier(tier)}
                >
                  <Text style={[styles.chipText, manageTier === tier && styles.chipTextActive]}>
                    {tier === 'basic' ? 'BASIC' : '⭐ PREMIUM'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {manageTier === 'basic' && (
              <Text style={styles.tierNote}>Upgrade to Premium to unlock events, merch, and featured placement</Text>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.createEventModalBtn} onPress={() => { setManageVisible(false); setCreateEventVisible(true); }}>
                <Text style={styles.createEventModalBtnText}>📅 CREATE EVENT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addMerchModalBtn} onPress={() => { setManageVisible(false); setAddMerchVisible(true); }}>
                <Text style={styles.addMerchModalBtnText}>👕 ADD MERCH</Text>
              </TouchableOpacity>
            </View>

            <GoldButton title="SAVE CHANGES" onPress={saveGym} loading={manageSaving} style={{ marginTop: 16 }} />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ─── CREATE EVENT MODAL ─── */}
      <Modal
        visible={createEventVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateEventVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE EVENT</Text>
              <TouchableOpacity onPress={() => setCreateEventVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>EVENT TITLE *</Text>
            <TextInput style={[styles.input, { marginBottom: 10 }]} value={evTitle} onChangeText={setEvTitle} placeholder="e.g. Saturday Morning 5K" placeholderTextColor={colors.muted} />

            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, { height: 60, marginBottom: 10 }]} value={evDesc} onChangeText={setEvDesc} placeholder="Details..." placeholderTextColor={colors.muted} multiline />

            <Text style={styles.formLabel}>EVENT TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.chipRow}>
                {[
                  { v: 'group_run', l: '🏃 Group Run' },
                  { v: 'group_workout', l: '🏋️ Group Workout' },
                  { v: 'competition', l: '🏆 Competition' },
                  { v: 'open_competition', l: '⚔️ Open' },
                ].map((et) => (
                  <TouchableOpacity
                    key={et.v}
                    style={[styles.chip, evType === et.v && styles.chipActive]}
                    onPress={() => setEvType(et.v)}
                  >
                    <Text style={[styles.chipText, evType === et.v && styles.chipTextActive]}>{et.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>DATE (YYYY-MM-DD) *</Text>
                <TextInput style={styles.input} value={evDate} onChangeText={setEvDate} placeholder="2026-04-01" placeholderTextColor={colors.muted} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formLabel}>TIME (HH:MM)</Text>
                <TextInput style={styles.input} value={evTime} onChangeText={setEvTime} placeholder="07:00" placeholderTextColor={colors.muted} />
              </View>
            </View>

            <Text style={[styles.formLabel, { marginTop: 10 }]}>LOCATION NAME</Text>
            <TextInput style={[styles.input, { marginBottom: 10 }]} value={evLocation} onChangeText={setEvLocation} placeholder="e.g. Piedmont Park" placeholderTextColor={colors.muted} />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>CITY</Text>
                <TextInput style={styles.input} value={evCity} onChangeText={setEvCity} placeholderTextColor={colors.muted} />
              </View>
              <View style={{ width: 80, marginLeft: 8 }}>
                <Text style={styles.formLabel}>STATE</Text>
                <TextInput style={styles.input} value={evState} onChangeText={setEvState} autoCapitalize="characters" maxLength={2} placeholderTextColor={colors.muted} />
              </View>
            </View>

            {evType === 'group_run' && (
              <>
                <Text style={[styles.formLabel, { marginTop: 10 }]}>DISTANCE (miles)</Text>
                <TextInput style={[styles.input, { marginBottom: 10 }]} value={evDistance} onChangeText={setEvDistance} placeholder="3.1" keyboardType="numeric" placeholderTextColor={colors.muted} />
              </>
            )}

            <View style={[styles.rowInputs, { alignItems: 'center', marginTop: 10 }]}>
              <Text style={[styles.formLabel, { flex: 1, marginBottom: 0 }]}>MAX PARTICIPANTS</Text>
              <TextInput style={[styles.input, { width: 70, textAlign: 'center' }]} value={evMaxPax} onChangeText={setEvMaxPax} keyboardType="numeric" />
            </View>

            <Text style={[styles.formLabel, { marginTop: 14 }]}>VISIBILITY</Text>
            <View style={styles.chipRow}>
              {[{ v: true, l: '🌐 Public' }, { v: false, l: '🔒 Members Only' }].map((vis) => (
                <TouchableOpacity
                  key={String(vis.v)}
                  style={[styles.chip, evPublic === vis.v && styles.chipActive]}
                  onPress={() => setEvPublic(vis.v)}
                >
                  <Text style={[styles.chipText, evPublic === vis.v && styles.chipTextActive]}>{vis.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <GoldButton title="CREATE EVENT" onPress={createEvent} loading={evCreating} style={{ marginTop: 20 }} />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── ADD MERCH MODAL ─── */}
      <Modal
        visible={addMerchVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddMerchVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD MERCH</Text>
              <TouchableOpacity onPress={() => setAddMerchVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>ITEM NAME *</Text>
            <TextInput style={[styles.input, { marginBottom: 10 }]} value={mName} onChangeText={setMName} placeholder="e.g. Iron Wolf Hoodie" placeholderTextColor={colors.muted} />
            <Text style={styles.formLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.input, { height: 60, marginBottom: 10 }]} value={mDesc} onChangeText={setMDesc} placeholder="Optional description..." placeholderTextColor={colors.muted} multiline />
            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>PRICE (USD)</Text>
                <TextInput style={styles.input} value={mPrice} onChangeText={setMPrice} placeholder="29.99" keyboardType="numeric" placeholderTextColor={colors.muted} />
              </View>
            </View>
            <Text style={[styles.formLabel, { marginTop: 10 }]}>PURCHASE URL</Text>
            <TextInput style={[styles.input, { marginBottom: 20 }]} value={mUrl} onChangeText={setMUrl} placeholder="https://..." placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" />
            <GoldButton title="ADD ITEM" onPress={addMerch} loading={mSaving} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddMerchVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollArea: { flex: 1 },
  content: { padding: 20 },

  outerTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  outerTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  outerTabActive: { borderBottomWidth: 2, borderBottomColor: colors.gold },
  outerTabText: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  outerTabTextActive: { color: colors.gold },

  searchInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
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
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.gold },

  gymCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  gymCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  gymNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  gymCardName: { fontSize: 16, fontWeight: '700', color: colors.text },
  gymCardLocation: { fontSize: 12, color: colors.muted, marginTop: 2 },
  gymCardMeta: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  gymCardDesc: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 10 },
  gymCardActions: { flexDirection: 'row' },

  verifiedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(76,201,112,0.15)',
    borderWidth: 1,
    borderColor: '#4CC970',
  },
  verifiedText: { color: '#4CC970', fontSize: 9, fontWeight: '700' },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  premiumBadgeText: { color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  followBtnText: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  memberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  memberBadgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  ownerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  ownerBadgeText: { color: colors.gold, fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginBottom: 12,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  // No gym
  noGymContainer: { alignItems: 'center', paddingTop: 40 },
  noGymTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  noGymSub: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  createForm: { width: '100%', marginTop: 20 },

  // Gym profile
  gymCoverPlaceholder: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: -30,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gymLogoPH: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -30,
    borderWidth: 3,
    borderColor: colors.background,
  },
  gymLogoInitial: { fontSize: 24, fontWeight: '800', color: colors.background },
  gymProfileHeader: { paddingTop: 40, paddingBottom: 16 },
  gymProfileName: { fontSize: 22, fontWeight: '800', color: colors.text },
  gymProfileMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  gymWebsiteLink: { fontSize: 12, color: colors.gold, marginTop: 4, textDecorationLine: 'underline' },
  gymProfileDesc: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6 },

  ownerActions: { marginBottom: 16 },
  manageGymBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignSelf: 'flex-start',
  },
  manageGymBtnText: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1 },

  innerTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  innerTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  innerTabActive: { borderBottomWidth: 2, borderBottomColor: colors.gold },
  innerTabText: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  innerTabTextActive: { color: colors.gold },

  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  addBtnText: { color: colors.gold, fontSize: 12, fontWeight: '700' },

  // Events mini card
  eventMiniCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    gap: 10,
  },
  eventMiniEmoji: { fontSize: 22, marginTop: 2 },
  eventMiniTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  eventMiniDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  eventMiniLocation: { fontSize: 11, color: colors.muted, marginTop: 2 },

  // Merch grid
  merchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  merchItem: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  merchImgPH: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  merchName: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 4 },
  merchPrice: { fontSize: 14, fontWeight: '700', color: colors.gold, marginBottom: 8 },
  buyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gold,
  },
  buyBtnText: { color: colors.background, fontSize: 11, fontWeight: '800' },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: colors.gold },
  memberName: { fontSize: 14, fontWeight: '600', color: colors.text },
  memberLocation: { fontSize: 11, color: colors.muted, marginTop: 1 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  roleBadgeText: { color: colors.gold, fontSize: 10, fontWeight: '700' },

  // Forms
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  rowInputs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 4,
  },
  tierNote: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16, fontStyle: 'italic' },

  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  createEventModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
  },
  createEventModalBtnText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  addMerchModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  addMerchModalBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },

  // Modal
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: colors.gold, letterSpacing: 2 },
  modalClose: { fontSize: 18, color: colors.muted, paddingHorizontal: 4 },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
