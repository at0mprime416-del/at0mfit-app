/**
 * FormCheckScreen
 *
 * Full-screen camera for recording exercise form check videos (max 30s).
 * Uses expo-camera CameraView.
 *
 * Route params:
 *   exerciseName — string
 *   onSaved()    — optional callback (navigate back with result in params instead)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video } from 'expo-av';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';

const MAX_DURATION = 30;
const { width, height } = Dimensions.get('window');

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function FormCheckScreen({ navigation, route }) {
  const exerciseName = route?.params?.exerciseName || 'Exercise';

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState('back');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [videoUri, setVideoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-stop at 30s
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return e + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    try {
      setElapsed(0);
      setRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      setVideoUri(video.uri);
      setRecording(false);
    } catch (e) {
      setRecording(false);
      console.warn('Recording error:', e);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && recording) {
      cameraRef.current.stopRecording();
    }
  };

  const handleRecordToggle = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRetake = () => {
    setVideoUri(null);
    setElapsed(0);
  };

  const handleSave = async () => {
    if (!videoUri) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const safeName = exerciseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filePath = `${user.id}/${safeName}/${timestamp}.mp4`;

      // Fetch and upload
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('form-videos')
        .upload(filePath, blob, { contentType: 'video/mp4', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('form-videos').getPublicUrl(filePath);
      const videoUrl = urlData.publicUrl;

      // Insert record
      const { error: insertError } = await supabase.from('form_videos').insert({
        user_id: user.id,
        exercise_name: exerciseName,
        video_url: videoUrl,
        duration_seconds: elapsed,
        recorded_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setUploading(false);
      Alert.alert(
        'Form check saved! 🎥',
        `${exerciseName} — ${elapsed}s clip uploaded.`,
        [{
          text: 'Done',
          onPress: () => navigation.goBack(),
        }]
      );
    } catch (err) {
      setUploading(false);
      Alert.alert('Upload failed', err.message);
    }
  };

  // ─── Permission gates ────────────────────────────────────────────────────────

  if (!cameraPermission || !micPermission) {
    return <View style={styles.permissionContainer}><ActivityIndicator color={colors.gold} /></View>;
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSubtitle}>At0m Fit needs your camera to record form check videos.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission}>
          <Text style={styles.permBtnText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!micPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permTitle}>Microphone Access Required</Text>
        <Text style={styles.permSubtitle}>At0m Fit needs your microphone to record audio with form check videos.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestMicPermission}>
          <Text style={styles.permBtnText}>GRANT MIC ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Preview mode (after recording) ─────────────────────────────────────────

  if (videoUri) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRetake} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>↩ RETAKE</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.exerciseLabel}>{exerciseName.toUpperCase()}</Text>
            <Text style={styles.durationLabel}>{elapsed}s</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        {/* Video preview */}
        <View style={styles.previewContainer}>
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPreview}
            useNativeControls
            resizeMode="contain"
            shouldPlay
            isLooping
          />
        </View>

        {/* Action buttons */}
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
            <Text style={styles.retakeBtnText}>🔁 RETAKE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveVideoBtn, uploading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.saveVideoBtnText}>SAVE TO EXERCISE ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Camera viewfinder ───────────────────────────────────────────────────────

  const progressPct = (elapsed / MAX_DURATION) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>✕ CLOSE</Text>
        </TouchableOpacity>
        <Text style={styles.exerciseLabel}>{exerciseName.toUpperCase()}</Text>
        <TouchableOpacity
          style={styles.flipBtn}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        >
          <Text style={styles.flipBtnText}>🔄 FLIP</Text>
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="video"
        />

        {/* Timer overlay (only while recording) */}
        {recording && (
          <View style={styles.timerOverlay}>
            <View style={styles.recDot} />
            <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            <Text style={styles.maxText}>/ {MAX_DURATION}s</Text>
          </View>
        )}

        {/* Progress bar at top */}
        {recording && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        )}
      </View>

      {/* Record button */}
      <View style={styles.controls}>
        <Text style={styles.hint}>
          {recording ? 'Tap to stop' : 'Tap to record (max 30s)'}
        </Text>
        <TouchableOpacity
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={handleRecordToggle}
          activeOpacity={0.85}
        >
          <View style={[styles.recordInner, recording && styles.recordInnerActive]} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerBtn: {
    minWidth: 80,
  },
  headerBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  durationLabel: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  flipBtn: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  flipBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  timerOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3333',
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  maxText: {
    color: colors.muted,
    fontSize: 12,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#ff3333',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 20,
    backgroundColor: '#000',
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 20,
    fontWeight: '600',
  },
  recordBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: {
    borderColor: '#ff3333',
  },
  recordInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ff3333',
  },
  recordInnerActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ff3333',
  },
  // Preview mode
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPreview: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#000',
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  saveVideoBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.gold,
  },
  saveVideoBtnText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Permission screens
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permSubtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  permBtnText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  backBtn: {
    paddingVertical: 10,
  },
  backBtnText: {
    color: colors.muted,
    fontSize: 14,
  },
});
