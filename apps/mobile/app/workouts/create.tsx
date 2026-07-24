import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { useWorkoutBuilderStore, DraftExercise } from '../../store/useWorkoutBuilderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { P, sharedStyles } from '../../constants/premiumTheme';

function ExerciseRow({ ex, index, total }: { ex: DraftExercise; index: number; total: number }) {
  const router = useRouter();
  const { removeExercise, beginReplace, reorder, updateExerciseConfig } = useWorkoutBuilderStore();
  const [expanded, setExpanded] = React.useState(false);

  const startReplace = () => {
    beginReplace(ex.tempId);
    router.push('/exercises?builderPick=1');
  };

  return (
    <View style={[sharedStyles.card, styles.exerciseCard]}>
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>
            {ex.sets} sets × {ex.reps} reps{ex.weight ? ` · ${ex.weight}` : ''}
            {ex.muscleGroup ? `  ·  ${ex.muscleGroup}` : ''}
          </Text>
        </View>
        <View style={styles.reorderCol}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Move ${ex.exerciseName} up`}
            disabled={index === 0}
            onPress={() => reorder(index, index - 1)}
            hitSlop={8}
          >
            <Text style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Move ${ex.exerciseName} down`}
            disabled={index === total - 1}
            onPress={() => reorder(index, index + 1)}
            hitSlop={8}
          >
            <Text style={[styles.reorderBtn, index === total - 1 && styles.reorderBtnDisabled]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={expanded ? `Hide configuration for ${ex.exerciseName}` : `Configure ${ex.exerciseName}`}
          onPress={() => setExpanded(!expanded)}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>{expanded ? 'Hide Details' : 'Configure'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Replace ${ex.exerciseName}`}
          onPress={startReplace}
          style={styles.actionBtn}
        >
          <Text style={styles.actionBtnText}>Replace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${ex.exerciseName}`}
          onPress={() => removeExercise(ex.tempId)}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionBtnText, styles.removeText]}>Remove</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.configGrid}>
          <ConfigField label="Sets" value={ex.sets} onChangeText={v => updateExerciseConfig(ex.tempId, { sets: v })} />
          <ConfigField label="Reps" value={ex.reps} onChangeText={v => updateExerciseConfig(ex.tempId, { reps: v })} />
          <ConfigField label="Weight" value={ex.weight} onChangeText={v => updateExerciseConfig(ex.tempId, { weight: v })} />
          <ConfigField
            label="RPE"
            value={ex.targetRpe?.toString() ?? ''}
            keyboardType="numeric"
            onChangeText={v => updateExerciseConfig(ex.tempId, { targetRpe: v ? Number(v) : undefined })}
          />
          <ConfigField
            label="Rest (sec)"
            value={ex.restSeconds?.toString() ?? ''}
            keyboardType="numeric"
            onChangeText={v => updateExerciseConfig(ex.tempId, { restSeconds: v ? Number(v) : undefined })}
          />
          <ConfigField
            label="Warm-up sets"
            value={ex.warmupSets.toString()}
            keyboardType="numeric"
            onChangeText={v => updateExerciseConfig(ex.tempId, { warmupSets: Number(v) || 0 })}
          />
          <TouchableOpacity
            accessible={true}
            accessibilityRole="switch"
            accessibilityState={{ checked: ex.isDropset }}
            accessibilityLabel={`Drop set for ${ex.exerciseName}`}
            onPress={() => updateExerciseConfig(ex.tempId, { isDropset: !ex.isDropset })}
            style={[styles.toggle, ex.isDropset ? styles.toggleOn : null]}
          >
            <Text style={[styles.toggleText, ex.isDropset ? styles.toggleTextOn : null]}>
              {ex.isDropset ? '✓ Drop Set' : 'Drop Set'}
            </Text>
          </TouchableOpacity>
          <View style={styles.notesField}>
            <Text style={styles.configLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Focus on tempo"
              placeholderTextColor="#444"
              value={ex.notes ?? ''}
              onChangeText={v => updateExerciseConfig(ex.tempId, { notes: v })}
              multiline
            />
          </View>
        </View>
      )}
    </View>
  );
}

function ConfigField({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'numeric' }) {
  return (
    <View style={styles.configField}>
      <Text style={styles.configLabel}>{label}</Text>
      <TextInput
        style={styles.configInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#444"
      />
    </View>
  );
}

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const session = useAuthStore((state) => state.session);
  const {
    name, notes, exercises, loading, saving, pendingPick,
    reset, loadExisting, setName, setNotes, resolvePendingPick, save,
  } = useWorkoutBuilderStore();

  useEffect(() => {
    if (params.planId) {
      loadExisting(params.planId);
    } else {
      reset();
    }
  }, [params.planId]);

  // Consume a pick handed back from the Exercise Library every time this screen regains focus.
  useFocusEffect(
    React.useCallback(() => {
      if (pendingPick) resolvePendingPick();
    }, [pendingPick])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please give your workout a name');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }
    if (!session?.user?.id) return;

    const savedId = await save(session.user.id);
    if (savedId) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to save workout template. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel and go back"
            onPress={() => router.back()}
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{params.planId ? 'Edit Template' : 'New Template'}</Text>
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Save workout template"
            onPress={handleSave}
            disabled={saving || loading}
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color={P.ACCENT} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={P.ACCENT} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }}>
            <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Workout Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Push Day, Full Body"
              placeholderTextColor="#444"
              value={name}
              onChangeText={setName}
            />

            <Text style={[sharedStyles.labelCaps, styles.inputLabel]}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesTextInput]}
              placeholder="Optional notes for this workout"
              placeholderTextColor="#444"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={[sharedStyles.rowBetween, { marginBottom: 12 }]}>
              <Text style={[sharedStyles.labelCaps, styles.sectionLabel]}>Exercises ({exercises.length})</Text>
              <TouchableOpacity
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Add exercise from library"
                onPress={() => router.push('/exercises?builderPick=1')}
                style={styles.addBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnText}>+ Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <Text style={styles.emptyText}>No exercises yet. Tap &quot;Add Exercise&quot; to browse the library.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {exercises.map((ex, index) => (
                  <ExerciseRow key={ex.tempId} ex={ex} index={index} total={exercises.length} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, width: '100%', maxW: 640, alignSelf: 'center' } as any,
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: P.BG,
  },
  headerBtn: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  cancelText: { color: P.TEXT_MUT, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.3 },
  saveText: { color: P.ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputLabel: { marginBottom: 8, marginLeft: 4 },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    marginBottom: 20,
  },
  notesTextInput: { minHeight: 70, textAlignVertical: 'top' },
  sectionLabel: { marginLeft: 4 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: P.RADIUS_FULL,
    backgroundColor: P.ACCENT_DIM,
    borderWidth: 1,
    borderColor: P.ACCENT_BORDER,
  },
  addBtnText: { color: P.ACCENT, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: P.TEXT_MUT, textAlign: 'center', marginTop: 30, fontWeight: '600', fontSize: 13 },
  exerciseCard: { padding: 16 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '900', color: P.TEXT_PRI, letterSpacing: -0.2 },
  exerciseMeta: { color: P.TEXT_SEC, fontSize: 11, fontWeight: '600', marginTop: 4 },
  reorderCol: { gap: 4 },
  reorderBtn: { color: P.ACCENT, fontSize: 16, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  reorderBtnDisabled: { color: P.TEXT_MUT, opacity: 0.3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  actionBtnText: { color: P.TEXT_SEC, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  removeText: { color: P.RED },
  configGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  configField: { width: '30%' },
  configLabel: { color: P.TEXT_MUT, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  configInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
  },
  toggleOn: { borderColor: P.ACCENT_BORDER, backgroundColor: P.ACCENT_DIM },
  toggleText: { color: P.TEXT_SEC, fontSize: 11, fontWeight: '800' },
  toggleTextOn: { color: P.ACCENT },
  notesField: { width: '100%' },
  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: P.TEXT_PRI,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: P.CARD_BORDER,
    minHeight: 48,
  },
});

