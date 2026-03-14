import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';

// ─── Background Location Task ────────────────────────────────────────────────
// Must be defined at module level (outside component) for expo-task-manager

const LOCATION_TASK_NAME = 'at0mfit-background-location';
const locationEventEmitter = new EventEmitter();
locationEventEmitter.setMaxListeners(20);

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.warn('[At0mFit] Background location error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      locationEventEmitter.emit('location', location);
    }
  }
});

const GOOGLE_MAPS_API_KEY = 'AIzaSyBYAe1iwUyAoMnZ3hIYG7P30Tb8oAiCwxM';

// ─── Helpers ────────────────────────────────────────────────────────────────

const haversineDistance = (coord1, coord2) => {
  const R = 3958.8;
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatPace = (paceSeconds) => {
  if (!paceSeconds || paceSeconds <= 0 || !isFinite(paceSeconds)) return '--:--';
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const todayStr = () => new Date().toISOString().split('T')[0];

// Sample array down to maxPoints evenly
const sampleCoords = (arr, maxPoints) => {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const result = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.round(i * step)]);
  }
  return result;
};

// ─── Google Maps API Calls ───────────────────────────────────────────────────

const fetchElevation = async (lat, lng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].elevation; // meters
    }
  } catch (e) {
    // Silent — elevation is non-critical
  }
  return null;
};

const snapToRoads = async (coordsArr) => {
  try {
    // Roads API max 100 points
    const sampled = sampleCoords(coordsArr, 100);
    const path = sampled.map((c) => `${c.latitude},${c.longitude}`).join('|');
    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.snappedPoints && data.snappedPoints.length > 0) {
      return data.snappedPoints.map((p) => ({
        latitude: p.location.latitude,
        longitude: p.location.longitude,
      }));
    }
  } catch (e) {
    // Silent — fallback to original coords
  }
  return null;
};

const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Search all results for neighborhood/sublocality/locality
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (
            component.types.includes('neighborhood') ||
            component.types.includes('sublocality') ||
            component.types.includes('sublocality_level_1')
          ) {
            return component.long_name;
          }
        }
      }
      // Fallback to locality
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (component.types.includes('locality')) {
            return component.long_name;
          }
        }
      }
    }
  } catch (e) {
    // Silent
  }
  return null;
};

// Build static map URL for route preview thumbnail
const buildStaticMapUrl = (coordsArr) => {
  const sampled = sampleCoords(coordsArr, 50);
  const pathStr = sampled.map((c) => `${c.latitude},${c.longitude}`).join('|');
  return `https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=color:0xC9A84C|weight:3|${pathStr}&key=${GOOGLE_MAPS_API_KEY}`;
};

// ─── Dark Map Style (At0m Fit aesthetic) ─────────────────────────────────────

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212133' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3d5c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LiveRunScreen({ navigation }) {
  // Run state
  const [status, setStatus] = useState('idle'); // idle | running | paused | finished
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coords, setCoords] = useState([]);
  const [currentCoord, setCurrentCoord] = useState(null);
  const [splits, setSplits] = useState([]);
  const avgHR = null; // placeholder — wearable not connected

  // Rolling pace window: array of { time: seconds, dist: miles }
  const paceWindowRef = useRef([]);
  const [currentPace, setCurrentPace] = useState(0);

  // Mile split tracking
  const lastMileRef = useRef(0);
  const mileStartElapsedRef = useRef(0);

  // Location subscription ref
  const locationSubscription = useRef(null);

  // Timer ref
  const timerRef = useRef(null);
  const elapsedRef = useRef(0); // shadow ref for use inside closures

  // ─── UPGRADE 1: Elevation tracking ────────────────────────────────────────
  const [elevation, setElevation] = useState(0);         // current elevation in feet
  const [elevationGain, setElevationGain] = useState(0); // accumulated gain in feet
  const [elevationLoss, setElevationLoss] = useState(0); // accumulated loss in feet
  const lastElevationRef = useRef(null);                  // last known elevation (meters)
  const gpsUpdateCountRef = useRef(0);                    // counter for batching elevation calls
  const elevationGainRef = useRef(0);                     // shadow ref for save

  // ─── UPGRADE 2: Snap-to-roads ─────────────────────────────────────────────
  const [optimizing, setOptimizing] = useState(false); // "Optimizing route..." overlay

  // ─── UPGRADE 3: Places auto-naming ────────────────────────────────────────
  const [runName, setRunName] = useState('');
  const startNamedRef = useRef(false); // only reverse-geocode once

  // ─── UPGRADE 5: Static map preview ────────────────────────────────────────
  const [staticMapUrl, setStaticMapUrl] = useState(null);

  // Save modal
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('Outdoor');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Finalized values for modal (set on FINISH tap)
  const finalDistance = useRef(0);
  const finalElapsed = useRef(0);
  const finalSplits = useRef([]);

  // ─── Timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // ─── GPS Tracking ───────────────────────────────────────────────────────

  const handleNewLocation = useCallback((location) => {
    const { latitude, longitude } = location.coords;
    const newCoord = { latitude, longitude };
    const now = elapsedRef.current;

    setCurrentCoord(newCoord);

    // UPGRADE 3: Auto-name on first GPS fix
    if (!startNamedRef.current) {
      startNamedRef.current = true;
      reverseGeocode(latitude, longitude).then((areaName) => {
        if (areaName) {
          setRunName(`${areaName} Run`);
        }
      });
    }

    setCoords((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const d = haversineDistance(last, newCoord);

        setDistance((dist) => {
          const newDist = dist + d;

          // Rolling pace window (30 second window)
          paceWindowRef.current.push({ time: now, dist: newDist });
          paceWindowRef.current = paceWindowRef.current.filter(
            (p) => now - p.time <= 30
          );
          if (paceWindowRef.current.length >= 2) {
            const oldest = paceWindowRef.current[0];
            const timeDelta = now - oldest.time;
            const distDelta = newDist - oldest.dist;
            if (distDelta > 0 && timeDelta > 0) {
              const pace = timeDelta / distDelta; // seconds per mile
              setCurrentPace(pace);
            }
          }

          // Mile split detection
          const newMile = Math.floor(newDist);
          if (newMile > lastMileRef.current && newMile > 0) {
            const paceForMile = now - mileStartElapsedRef.current;
            setSplits((s) => [
              ...s,
              { mile: newMile, pace_seconds: paceForMile },
            ]);
            lastMileRef.current = newMile;
            mileStartElapsedRef.current = now;
            finalSplits.current = [
              ...finalSplits.current,
              { mile: newMile, pace_seconds: paceForMile },
            ];
          }

          finalDistance.current = newDist;
          return newDist;
        });
      }

      // UPGRADE 1: Elevation — call every 10th GPS update
      gpsUpdateCountRef.current += 1;
      if (gpsUpdateCountRef.current % 10 === 0) {
        fetchElevation(latitude, longitude).then((elevMeters) => {
          if (elevMeters !== null) {
            const elevFeet = elevMeters * 3.28084;
            setElevation(Math.round(elevFeet));

            if (lastElevationRef.current !== null) {
              const delta = elevMeters - lastElevationRef.current;
              if (delta > 0) {
                setElevationGain((g) => {
                  const newGain = g + delta * 3.28084;
                  elevationGainRef.current = newGain;
                  return newGain;
                });
              } else if (delta < 0) {
                setElevationLoss((l) => l + Math.abs(delta) * 3.28084);
              }
            }
            lastElevationRef.current = elevMeters;
          }
        });
      }

      return [...prev, newCoord];
    });
  }, []);

  const startTracking = async () => {
    // Foreground permission
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      Alert.alert('Permission needed', 'Enable location to track runs.');
      return;
    }

    // Background permission (needed for task-based tracking)
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert(
        'Background location needed',
        'Please allow "Always" location access so At0m Fit can track your run when the screen locks.',
        [{ text: 'OK' }]
      );
      // Still proceed — will fall back to foreground-only if task fails
    }

    elapsedRef.current = 0;
    setElapsed(0);
    setDistance(0);
    setCoords([]);
    setSplits([]);
    paceWindowRef.current = [];
    lastMileRef.current = 0;
    mileStartElapsedRef.current = 0;
    finalDistance.current = 0;
    finalElapsed.current = 0;
    finalSplits.current = [];

    // Reset elevation
    setElevation(0);
    setElevationGain(0);
    setElevationLoss(0);
    lastElevationRef.current = null;
    gpsUpdateCountRef.current = 0;
    elevationGainRef.current = 0;

    // Reset naming
    setRunName('');
    startNamedRef.current = false;

    // Reset static map
    setStaticMapUrl(null);

    setStatus('running');

    // Keep screen awake while running
    activateKeepAwakeAsync();

    // Stop any existing background task before starting fresh
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (_) {}

    // Start background location task
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'At0m Fit — Run Active',
          notificationBody: 'Tracking your run...',
          notificationColor: '#C9A84C',
        },
      });

      // Listen for location events from background task
      locationEventEmitter.on('location', handleNewLocation);
      locationSubscription.current = { type: 'background' };
    } catch (err) {
      console.warn('[At0mFit] Background task failed, falling back to foreground:', err.message);
      // Fallback to foreground watchPositionAsync
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        handleNewLocation
      );
      locationSubscription.current = sub;
    }
  };

  const pauseTracking = async () => {
    // Stop background task
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (_) {}

    // Remove foreground subscription (fallback path)
    if (locationSubscription.current && locationSubscription.current.remove) {
      locationSubscription.current.remove();
    }
    locationEventEmitter.removeAllListeners('location');
    locationSubscription.current = null;

    // Allow screen to sleep while paused
    deactivateKeepAwake();
    setStatus('paused');
  };

  const resumeTracking = async () => {
    setStatus('running');
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      handleNewLocation
    );
    locationSubscription.current = sub;
  };

  const finishRun = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Snapshot final values
    setDistance((d) => { finalDistance.current = d; return d; });
    setElapsed((e) => { finalElapsed.current = e; return e; });
    setStatus('finished');

    // UPGRADE 2: Snap to roads before showing modal
    setOptimizing(true);

    setCoords((currentCoords) => {
      const runCoords = [...currentCoords];

      // Build static map URL (UPGRADE 5) + snap to roads (UPGRADE 2) in parallel
      const doOptimize = async () => {
        const [snapped] = await Promise.all([
          runCoords.length >= 2 ? snapToRoads(runCoords) : Promise.resolve(null),
        ]);

        let finalCoords = runCoords;
        if (snapped && snapped.length > 0) {
          finalCoords = snapped;
          setCoords(snapped);
        }

        // Build static map thumbnail
        if (finalCoords.length >= 2) {
          setStaticMapUrl(buildStaticMapUrl(finalCoords));
        }

        setOptimizing(false);
        setShowModal(true);
      };

      doOptimize();
      return currentCoords; // keep state unchanged until async updates
    });
  };

  // ─── Save to Supabase ───────────────────────────────────────────────────

  const saveRun = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in.');
        setSaving(false);
        return;
      }

      const dist = finalDistance.current;
      const dur = finalElapsed.current;
      const pace = dist > 0 ? Math.round(dur / dist) : 0;

      const { error } = await supabase.from('runs').insert({
        user_id: user.id,
        date: todayStr(),
        type: selectedType,
        distance_mi: dist,
        duration_seconds: dur,
        pace_per_mile_seconds: pace,
        elevation_ft: Math.round(elevationGainRef.current),
        notes: notes.trim() || null,
      });

      setSaving(false);

      if (error) {
        Alert.alert('Save failed', error.message);
        return;
      }

      setShowModal(false);
      navigation.navigate('Run');
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.message);
    }
  };

  const discardRun = () => {
    setShowModal(false);
    navigation.navigate('Run');
  };

  // ─── Map region ─────────────────────────────────────────────────────────

  const mapRegion = currentCoord
    ? {
        latitude: currentCoord.latitude,
        longitude: currentCoord.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : {
        latitude: 33.749,
        longitude: -84.388,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  // ─── Render ─────────────────────────────────────────────────────────────

  const avgPaceSeconds = distance > 0 && elapsed > 0 ? Math.round(elapsed / distance) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* TOP — Live Stats Bar (4 stats with elevation) */}
      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
          <Text style={styles.statUnit}>mi</Text>
          <Text style={styles.statLabel}>DISTANCE</Text>
        </View>
        <View style={[styles.statCard, styles.statCardBorder]}>
          <Text style={styles.statValue}>{formatPace(currentPace > 0 ? currentPace : avgPaceSeconds)}</Text>
          <Text style={styles.statUnit}>/mi</Text>
          <Text style={styles.statLabel}>PACE</Text>
        </View>
        <View style={[styles.statCard, styles.statCardBorder]}>
          <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
          <Text style={styles.statUnit}> </Text>
          <Text style={styles.statLabel}>TIME</Text>
        </View>
        {/* UPGRADE 1: Elevation gain stat */}
        <View style={[styles.statCard, styles.statCardBorder]}>
          <Text style={styles.statValue}>↑{Math.round(elevationGain)}</Text>
          <Text style={styles.statUnit}>ft</Text>
          <Text style={styles.statLabel}>ELEV</Text>
        </View>
      </View>

      {/* MIDDLE — Map */}
      <View style={styles.mapContainer}>
        {/* UPGRADE 4: Dark map style applied via customMapStyle */}
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          mapType="standard"
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
          customMapStyle={DARK_MAP_STYLE}
        >
          {coords.length > 1 && (
            <Polyline
              coordinates={coords}
              strokeColor="#C9A84C"
              strokeWidth={4}
            />
          )}
          {currentCoord && (
            <Marker coordinate={currentCoord} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerDot} />
            </Marker>
          )}
        </MapView>

        {/* GPS signal overlay */}
        {status !== 'idle' && !currentCoord && (
          <View style={styles.gpsOverlay}>
            <Text style={styles.gpsOverlayText}>📡 Getting GPS signal...</Text>
          </View>
        )}

        {/* Status badge */}
        {status === 'paused' && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedBadgeText}>⏸ PAUSED</Text>
          </View>
        )}

        {/* UPGRADE 2: Optimizing route overlay */}
        {optimizing && (
          <View style={styles.optimizingOverlay}>
            <ActivityIndicator size="small" color="#C9A84C" />
            <Text style={styles.optimizingText}>Optimizing route...</Text>
          </View>
        )}
      </View>

      {/* BOTTOM — Controls */}
      <View style={styles.bottomSection}>
        {status === 'idle' && (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.startBtnText}>START RUN</Text>
          </TouchableOpacity>
        )}

        {status === 'running' && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.outlineBtn} onPress={pauseTracking}>
              <Text style={styles.outlineBtnText}>PAUSE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.goldBtn} onPress={finishRun}>
              <Text style={styles.goldBtnText}>FINISH</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'paused' && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.goldBtn} onPress={resumeTracking}>
              <Text style={styles.goldBtnText}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={finishRun}>
              <Text style={styles.outlineBtnText}>FINISH</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mile Splits */}
        {splits.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.splitsScroll}
            contentContainerStyle={styles.splitsContent}
          >
            {splits.map((split) => (
              <View key={split.mile} style={styles.splitChip}>
                <Text style={styles.splitText}>
                  Mile {split.mile}: {formatPace(split.pace_seconds)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* SAVE MODAL */}
      <Modal visible={showModal} animationType="slide" transparent={false} presentationStyle="pageSheet">
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>🏁 RUN COMPLETE</Text>

            {/* UPGRADE 5: Static map route preview thumbnail */}
            {staticMapUrl ? (
              <View style={styles.routePreviewContainer}>
                <Image
                  source={{ uri: staticMapUrl }}
                  style={styles.routePreviewImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{finalDistance.current.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>MILES</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatTime(finalElapsed.current)}</Text>
                <Text style={styles.summaryLabel}>TIME</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {formatPace(finalDistance.current > 0 ? Math.round(finalElapsed.current / finalDistance.current) : 0)}
                </Text>
                <Text style={styles.summaryLabel}>AVG PACE</Text>
              </View>
              {/* UPGRADE 1: Show elevation gain in summary */}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>↑{Math.round(elevationGain)}</Text>
                <Text style={styles.summaryLabel}>ELEV FT</Text>
              </View>
            </View>

            {/* Splits list */}
            {splits.length > 0 && (
              <View style={styles.splitsList}>
                <Text style={styles.splitsTitle}>MILE SPLITS</Text>
                {splits.map((split) => (
                  <View key={split.mile} style={styles.splitRow}>
                    <Text style={styles.splitRowLabel}>Mile {split.mile}</Text>
                    <Text style={styles.splitRowPace}>{formatPace(split.pace_seconds)}/mi</Text>
                  </View>
                ))}
              </View>
            )}

            {/* UPGRADE 3: Auto-named run title (editable) */}
            <Text style={styles.fieldLabel}>RUN NAME</Text>
            <TextInput
              style={styles.runNameInput}
              value={runName}
              onChangeText={setRunName}
              placeholder="Name your run..."
              placeholderTextColor="#555"
            />

            {/* Run type picker */}
            <Text style={styles.fieldLabel}>RUN TYPE</Text>
            <View style={styles.typeRow}>
              {['Outdoor', 'Indoor', 'Trail', 'Race'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
                  onPress={() => setSelectedType(t)}
                >
                  <Text style={[styles.typeChipText, selectedType === t && styles.typeChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Felt strong, legs fresh..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveRun}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'SAVING...' : 'SAVE RUN'}</Text>
            </TouchableOpacity>

            {/* Discard */}
            <TouchableOpacity style={styles.discardBtn} onPress={discardRun}>
              <Text style={styles.discardBtnText}>DISCARD</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Stats bar — now 4 columns
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statCardBorder: {
    borderLeftWidth: 1,
    borderColor: '#2a2a2a',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#C9A84C',
    lineHeight: 26,
  },
  statUnit: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    color: '#555',
    letterSpacing: 1.2,
    fontWeight: '700',
  },

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C9A84C',
    borderWidth: 3,
    borderColor: '#0a0a0a',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  gpsOverlay: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  gpsOverlayText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },
  pausedBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#888',
  },
  pausedBadgeText: {
    color: '#aaa',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  // UPGRADE 2: Optimizing overlay
  optimizingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  optimizingText: {
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Bottom controls
  bottomSection: {
    backgroundColor: '#0f0f0f',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  startBtn: {
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#0a0a0a',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goldBtn: {
    flex: 1,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  goldBtnText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  outlineBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
  },
  outlineBtnText: {
    color: '#C9A84C',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Splits scroll
  splitsScroll: {
    marginTop: 12,
    maxHeight: 36,
  },
  splitsContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  splitChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  splitText: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal
  modal: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 48,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#C9A84C',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },

  // UPGRADE 5: Route preview thumbnail
  routePreviewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  routePreviewImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#111',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C9A84C',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#555',
    letterSpacing: 1.2,
    fontWeight: '700',
  },

  // Splits list in modal
  splitsList: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  splitsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C9A84C',
    letterSpacing: 2,
    marginBottom: 10,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  splitRowLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  splitRowPace: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '700',
  },

  // UPGRADE 3: Run name input
  runNameInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#C9A84C44',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 20,
    fontWeight: '600',
  },

  // Type chips
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C9A84C',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    alignItems: 'center',
  },
  typeChipActive: {
    borderColor: '#C9A84C',
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  typeChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#C9A84C',
  },

  // Notes
  notesInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    marginBottom: 24,
  },

  // Save / Discard
  saveBtn: {
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  discardBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  discardBtnText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
