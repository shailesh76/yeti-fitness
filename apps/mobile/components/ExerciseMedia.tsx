import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { P } from '../constants/premiumTheme';

interface ExerciseMediaProps {
  uri?: string | null;
  height?: number;
}

/**
 * Hero exercise media (GIF or still). expo-image handles disk caching itself
 * (cachePolicy="disk", the default) — retry-on-failure isn't a built-in prop,
 * so failure is tracked locally and a key bump forces a clean remount to
 * re-trigger the load. Media stays remote always; nothing here touches
 * WatermelonDB — see ExerciseRepository for why (only metadata is cached
 * locally, per the offline-support design for this screen).
 */
function ExerciseMedia({ uri, height = 240 }: ExerciseMediaProps) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt(a => a + 1);
  }, []);

  if (!uri) {
    return (
      <View style={[styles.wrapper, styles.emptyWrapper, { height: Math.min(height, 100) }]}>
        <Text style={styles.emptyText}>No demonstration media available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <Image
        key={attempt}
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        cachePolicy="disk"
        priority="high"
        transition={250}
        placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
        placeholderContentFit="cover"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'error' && (
        <View style={[StyleSheet.absoluteFill, styles.errorOverlay]}>
          <Text style={styles.errorText}>Couldn&apos;t load media</Text>
          <TouchableOpacity onPress={retry} style={styles.retryBtn} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default memo(ExerciseMedia);

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontWeight: '700',
  },
  errorOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: P.TEXT_SEC,
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  retryText: {
    color: P.ACCENT,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
