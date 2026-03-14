/**
 * FilteredImage — lightweight overlay-based photo filters.
 * No native deps. Works in Expo Go and bare builds.
 *
 * Filters simulate look via semi-transparent View overlays.
 * The original image is always stored; filter_name is metadata.
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// ─── Filter definitions ───────────────────────────────────────────────────────
// Each filter: array of overlay layers rendered on top of the image.
// Layers are applied in order (bottom → top).

export const FILTER_DEFS = {
  original: {
    label: 'ORIGINAL',
    overlays: [],
  },
  gains: {
    label: 'GAINS',
    // Warm amber + slight brightness boost — good for muscle definition
    overlays: [
      { backgroundColor: 'rgba(255, 130, 30, 0.14)' },
      { backgroundColor: 'rgba(255, 255, 200, 0.06)' },
    ],
  },
  iron: {
    label: 'IRON',
    // Dark + muted (simulates desaturation + contrast)
    overlays: [
      { backgroundColor: 'rgba(20, 20, 20, 0.22)' },
      { backgroundColor: 'rgba(180, 180, 180, 0.18)' },
    ],
  },
  golden: {
    label: 'GOLDEN',
    // Warm golden-hour amber
    overlays: [
      { backgroundColor: 'rgba(255, 195, 40, 0.18)' },
    ],
  },
  crisp: {
    label: 'CRISP',
    // Cool blue tint, high-clarity feel
    overlays: [
      { backgroundColor: 'rgba(80, 160, 255, 0.13)' },
      { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    ],
  },
  night: {
    label: 'NIGHT',
    // Dark moody purple
    overlays: [
      { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
      { backgroundColor: 'rgba(100, 20, 160, 0.13)' },
    ],
  },
};

export const FILTER_NAMES = Object.keys(FILTER_DEFS);

// ─── FilteredImage component ─────────────────────────────────────────────────

export default function FilteredImage({ uri, filterName = 'original', style, imageStyle }) {
  const filter = FILTER_DEFS[filterName] || FILTER_DEFS.original;

  return (
    <View style={[styles.wrapper, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, imageStyle]}
        resizeMode="cover"
      />
      {filter.overlays.map((overlay, i) => (
        <View
          key={i}
          style={[StyleSheet.absoluteFill, styles.overlay, overlay]}
          pointerEvents="none"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    borderRadius: 0,
  },
});
