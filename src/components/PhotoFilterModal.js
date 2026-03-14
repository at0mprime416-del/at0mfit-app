/**
 * PhotoFilterModal
 *
 * Full-screen modal shown after photo capture/selection.
 * Lets user pick a filter, then optionally a label (for progress photos).
 * Returns { filterName, label } via onSave(filterName, label).
 *
 * Props:
 *   visible        — boolean
 *   uri            — string  (image URI)
 *   context        — 'profile' | 'progress'
 *   onSave(filterName, label) — callback
 *   onCancel()     — callback
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import { FILTER_DEFS, FILTER_NAMES } from './FilteredImage';
import FilteredImage from './FilteredImage';

const { width, height } = Dimensions.get('window');
const THUMB_SIZE = 64;

const LABEL_OPTIONS = [
  { key: 'front', emoji: '🔵', label: 'Front' },
  { key: 'back',  emoji: '🔴', label: 'Back' },
  { key: 'side',  emoji: '🟡', label: 'Side' },
  { key: 'other', emoji: '⚪', label: 'Other' },
];

export default function PhotoFilterModal({ visible, uri, context = 'profile', onSave, onCancel }) {
  const [activeFilter, setActiveFilter] = useState('original');
  const [activeLabel, setActiveLabel] = useState('front');

  if (!visible || !uri) return null;

  const handleSave = () => {
    onSave(activeFilter, activeLabel);
    // Reset for next use
    setActiveFilter('original');
    setActiveLabel('front');
  };

  const handleCancel = () => {
    setActiveFilter('original');
    setActiveLabel('front');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>✕ RETAKE</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CHOOSE FILTER</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>SAVE ✓</Text>
          </TouchableOpacity>
        </View>

        {/* Main preview — full available height minus strip */}
        <View style={styles.previewContainer}>
          <FilteredImage
            uri={uri}
            filterName={activeFilter}
            style={styles.previewImage}
            imageStyle={{ borderRadius: 0 }}
          />

          {/* Filter name badge */}
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {FILTER_DEFS[activeFilter]?.label || 'ORIGINAL'}
            </Text>
          </View>
        </View>

        {/* Label picker — only for progress photos */}
        {context === 'progress' && (
          <View style={styles.labelSection}>
            <Text style={styles.labelSectionTitle}>ANGLE</Text>
            <View style={styles.labelRow}>
              {LABEL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.labelChip, activeLabel === opt.key && styles.labelChipActive]}
                  onPress={() => setActiveLabel(opt.key)}
                >
                  <Text style={styles.labelChipEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.labelChipText, activeLabel === opt.key && styles.labelChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Filter strip */}
        <View style={styles.stripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {FILTER_NAMES.map((filterName) => {
              const def = FILTER_DEFS[filterName];
              const isActive = activeFilter === filterName;
              return (
                <TouchableOpacity
                  key={filterName}
                  style={styles.filterItem}
                  onPress={() => setActiveFilter(filterName)}
                  activeOpacity={0.8}
                >
                  {/* Thumbnail with filter applied */}
                  <View style={[styles.thumbWrapper, isActive && styles.thumbWrapperActive]}>
                    <FilteredImage
                      uri={uri}
                      filterName={filterName}
                      style={styles.thumb}
                    />
                  </View>
                  <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                    {def.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 80,
  },
  headerBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  saveBtnText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#111',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
  },
  filterBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  filterBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  labelSection: {
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  labelSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  labelChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  labelChipEmoji: {
    fontSize: 12,
  },
  labelChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  labelChipTextActive: {
    color: colors.gold,
  },
  stripContainer: {
    backgroundColor: '#0a0a0a',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  strip: {
    paddingHorizontal: 12,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  filterItem: {
    alignItems: 'center',
    gap: 6,
  },
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbWrapperActive: {
    borderColor: colors.gold,
    // Extra glow ring via shadow
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  filterLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  filterLabelActive: {
    color: colors.gold,
  },
});
