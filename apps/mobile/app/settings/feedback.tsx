import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { P, glowStyle, sharedStyles } from '../../constants/premiumTheme';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  'Bug',
  'Feature request',
  'Workout issue',
  'AI coach issue',
  'Other',
];

export default function BetaFeedbackScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id;

  const [category, setCategory] = useState('Bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      setError('Please enter your feedback description.');
      return;
    }
    if (!userId) {
      setError('You must be logged in to submit feedback.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from('beta_user_feedback')
        .insert({
          user_id: userId,
          category,
          feedback_text: feedbackText.trim(),
          rating: rating,
        });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setFeedbackText('');
      setRating(null);
    } catch (err: any) {
      console.error('[BetaFeedback] Submission error:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Feedback Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for helping us make Yeti Fitness better. Our engineering team reviews every submission.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={sharedStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Send Beta Feedback</Text>
          <Text style={styles.subtitle}>
            Help us squash bugs and refine features before our public release.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* 1. Category Picker */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={`Select category ${cat}`}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. Star Rating */}
          <Text style={styles.sectionLabel}>Rating (Optional)</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isSelected = rating !== null && rating >= star;
              return (
                <TouchableOpacity
                  key={star}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} out of 5 stars`}
                  onPress={() => setRating(star)}
                  style={styles.starTouch}
                >
                  <Text style={[styles.starIcon, isSelected && styles.starSelected]}>
                    {isSelected ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Text Input */}
          <Text style={styles.sectionLabel}>Description</Text>
          <TextInput
            accessible={true}
            accessibilityLabel="Feedback description"
            style={styles.textInput}
            multiline
            numberOfLines={6}
            placeholder="Describe the issue, feature idea, or feedback details..."
            placeholderTextColor={P.TEXT_MUT}
            value={feedbackText}
            onChangeText={(text) => {
              setFeedbackText(text);
              if (error) setError(null);
            }}
          />

          {/* 4. Submit Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Submit feedback"
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.BG,
  },
  title: {
    color: P.TEXT_PRI,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: P.TEXT_SEC,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 26,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: P.TEXT_MUT,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 14,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: P.RADIUS_SM,
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  categoryChipActive: {
    backgroundColor: P.ACCENT_DIM,
    borderColor: P.ACCENT,
  },
  categoryChipText: {
    color: P.TEXT_SEC,
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: P.ACCENT,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  starTouch: {
    padding: 4,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    fontSize: 34,
    color: P.TEXT_MUT,
  },
  starSelected: {
    color: P.ACCENT,
  },
  textInput: {
    backgroundColor: P.CARD_BG,
    color: P.TEXT_PRI,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    borderRadius: P.RADIUS_SM,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 30,
  },
  submitBtn: {
    backgroundColor: P.ACCENT,
    paddingVertical: 16,
    minHeight: 44,
    borderRadius: P.RADIUS_SM,
    alignItems: 'center',
    justifyContent: 'center',
    ...glowStyle(P.ACCENT, 12, 0.3),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: P.RED,
    borderWidth: 1,
    borderRadius: P.RADIUS_SM,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: P.RED,
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    color: P.TEXT_PRI,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  successSubtitle: {
    color: P.TEXT_SEC,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backBtn: {
    backgroundColor: P.CARD_BG,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: P.RADIUS_SM,
  },
  backBtnText: {
    color: P.TEXT_PRI,
    fontWeight: '700',
    fontSize: 15,
  },
});

