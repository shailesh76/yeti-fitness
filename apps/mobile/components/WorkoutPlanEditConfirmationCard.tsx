import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProposedPlanEditData } from '../services/aiCoachWorkoutPlan';

const P = {
  BG: '#0D0E12',
  CARD_BG: '#16181F',
  BORDER: 'rgba(255,255,255,0.08)',
  TEXT_PRI: '#FFFFFF',
  TEXT_SEC: '#94A3B8',
  TEXT_MUT: '#64748B',
  ACCENT_GREEN: '#10B981',
  ACCENT_BLUE: '#38BDF8',
  ACCENT_RED: '#EF4444',
  ACCENT_AMBER: '#F59E0B',
  ACCENT_PURPLE: '#8B5CF6',
};

export interface WorkoutPlanEditConfirmationCardProps {
  proposal: ProposedPlanEditData;
  isApplying?: boolean;
  applied?: boolean;
  cancelled?: boolean;
  status?: 'pending' | 'applied' | 'cancelled' | 'expired' | 'stale';
  onConfirm: () => void;
  onCancel: () => void;
}

export const WorkoutPlanEditConfirmationCard: React.FC<WorkoutPlanEditConfirmationCardProps> = ({
  proposal,
  isApplying = false,
  applied = false,
  cancelled = false,
  status = 'pending',
  onConfirm,
  onCancel,
}) => {
  const currentStatus = status === 'applied' || applied
    ? 'applied'
    : status === 'cancelled' || cancelled
    ? 'cancelled'
    : status;

  const getActionBadge = () => {
    switch (proposal.action) {
      case 'add':
        return { label: 'ADD EXERCISE', color: P.ACCENT_GREEN, icon: 'add-circle-outline' as const };
      case 'remove':
        return { label: 'REMOVE EXERCISE', color: P.ACCENT_RED, icon: 'trash-outline' as const };
      case 'replace':
        return { label: 'REPLACE EXERCISE', color: P.ACCENT_BLUE, icon: 'swap-horizontal-outline' as const };
      case 'move':
        return { label: 'MOVE EXERCISE', color: P.ACCENT_AMBER, icon: 'arrow-forward-circle-outline' as const };
      case 'update_sets_reps':
        return { label: 'UPDATE SETS & REPS', color: P.ACCENT_PURPLE, icon: 'repeat-outline' as const };
      case 'update_rest':
        return { label: 'UPDATE REST TIME', color: P.ACCENT_PURPLE, icon: 'timer-outline' as const };
      default:
        return { label: 'PLAN CHANGE', color: P.ACCENT_BLUE, icon: 'barbell-outline' as const };
    }
  };

  const badge = getActionBadge();

  return (
    <View style={styles.cardContainer}>
      {/* Header with action tag */}
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: `${badge.color}20`, borderColor: `${badge.color}40` }]}>
          <Ionicons name={badge.icon} size={13} color={badge.color} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        {proposal.dayName && (
          <Text style={styles.dayTargetText}>{proposal.dayName}</Text>
        )}
      </View>

      {/* Main Details Box */}
      <View style={styles.detailsBox}>
        <Text style={styles.exerciseTitle}>
          {proposal.exerciseName}
          {proposal.replacementExerciseName ? ` ➔ ${proposal.replacementExerciseName}` : ''}
        </Text>

        {proposal.proposedValueDescription ? (
          <Text style={styles.proposedDesc}>{proposal.proposedValueDescription}</Text>
        ) : null}

        {proposal.currentValueDescription && currentStatus === 'pending' ? (
          <Text style={styles.currentDesc}>Current: {proposal.currentValueDescription}</Text>
        ) : null}
      </View>

      {/* Actions / Status footer */}
      {currentStatus === 'applied' && (
        <View style={styles.appliedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={P.ACCENT_GREEN} />
          <Text style={styles.appliedText}>✓ Change applied to {proposal.planName || 'your plan'}</Text>
        </View>
      )}

      {currentStatus === 'cancelled' && (
        <View style={styles.cancelledBanner}>
          <Ionicons name="close-circle-outline" size={16} color={P.TEXT_MUT} />
          <Text style={styles.cancelledText}>Change cancelled — no edits made</Text>
        </View>
      )}

      {currentStatus === 'expired' && (
        <View style={styles.expiredBanner}>
          <Ionicons name="time-outline" size={16} color={P.ACCENT_AMBER} />
          <Text style={styles.expiredText}>Proposal expired. Please request again.</Text>
        </View>
      )}

      {currentStatus === 'stale' && (
        <View style={styles.expiredBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={P.ACCENT_AMBER} />
          <Text style={styles.expiredText}>Plan state changed. Please request again.</Text>
        </View>
      )}

      {currentStatus === 'pending' && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, isApplying && styles.disabledBtn]}
            onPress={onCancel}
            disabled={isApplying}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, isApplying && styles.disabledBtn]}
            onPress={onConfirm}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>Confirm Change</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: P.CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.BORDER,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayTargetText: {
    fontSize: 12,
    color: P.TEXT_SEC,
    fontWeight: '600',
  },
  detailsBox: {
    marginBottom: 12,
  },
  exerciseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.TEXT_PRI,
    marginBottom: 4,
  },
  proposedDesc: {
    fontSize: 13,
    color: P.TEXT_SEC,
    lineHeight: 18,
  },
  currentDesc: {
    fontSize: 12,
    color: P.TEXT_MUT,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: P.TEXT_SEC,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: P.ACCENT_GREEN,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  appliedText: {
    color: P.ACCENT_GREEN,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  cancelledText: {
    color: P.TEXT_MUT,
    fontSize: 12,
    fontStyle: 'italic',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  expiredText: {
    color: P.ACCENT_AMBER,
    fontSize: 12,
    fontWeight: '500',
  },
});
