import { describe, it, expect } from 'vitest';
import { AICoachRepository } from '../packages/database/src/repositories/AICoachRepository';
import { UserRepository } from '../packages/database/src/repositories/UserRepository';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import { NutritionRepository } from '../packages/database/src/repositories/NutritionRepository';
import { ProgressRepository } from '../packages/database/src/repositories/ProgressRepository';
import { MediaRepository } from '../packages/database/src/repositories/MediaRepository';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';

/**
 * Covers the WatermelonDB-null-on-web guard pattern added across 8 repositories
 * this session (real bugs found via live testing: AICoachRepository crashed with
 * "Cannot read properties of null (reading 'write')" on web, then the same class
 * of bug in MediaRepository, then a whole repository sweep). The rule established:
 * write methods throw a clear LOCAL_DB_UNAVAILABLE error (so the caller can show
 * a "not available on web" message or a real error); read methods that feed a
 * screen's primary render gracefully return an empty/zero default instead,
 * since throwing there would abort whatever multi-step loader called them
 * (this exact failure mode broke home.tsx's Yeti Score calculation).
 */
describe('Repository WatermelonDB-null guards (web platform)', () => {
  const LOCAL_DB_UNAVAILABLE = /LOCAL_DB_UNAVAILABLE/;

  describe('write methods throw a clear error instead of null-deref crashing', () => {
    it('AICoachRepository.saveMessageLocal throws when db is null', async () => {
      const repo = new AICoachRepository(null as any, {});
      await expect(repo.saveMessageLocal('conv-1', 'user', 'hi')).rejects.toThrow(LOCAL_DB_UNAVAILABLE);
    });

    it('AICoachRepository.getOrCreateConversation throws when db is null', async () => {
      const repo = new AICoachRepository(null as any, {});
      await expect(repo.getOrCreateConversation('user-1')).rejects.toThrow(LOCAL_DB_UNAVAILABLE);
    });

    it('UserRepository.updateProfile throws when db is null', async () => {
      const repo = new UserRepository(null as any, {});
      await expect(repo.updateProfile('user-1', { full_name: 'Test' })).rejects.toThrow(LOCAL_DB_UNAVAILABLE);
    });

    it('WorkoutRepository.createWorkoutSession throws when db is null', async () => {
      const repo = new WorkoutRepository(null as any, {});
      await expect(repo.createWorkoutSession('user-1', 'Leg Day')).rejects.toThrow(LOCAL_DB_UNAVAILABLE);
    });

    it('MediaRepository.savePhotoMetadata throws when db is null', async () => {
      const repo = new MediaRepository(null as any, {});
      await expect(repo.savePhotoMetadata('user-1', 'key.jpg')).rejects.toThrow(LOCAL_DB_UNAVAILABLE);
    });
  });

  describe('read methods gracefully degrade instead of throwing', () => {
    it('NutritionRepository.calculateDailyNutrition returns zero-macro default when db is null', async () => {
      const repo = new NutritionRepository(null as any, {});
      const result = await repo.calculateDailyNutrition('user-1', Date.now());
      expect(result).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('ProgressRepository.getWeightTrend returns [] when db is null', async () => {
      const repo = new ProgressRepository(null as any, {});
      const result = await repo.getWeightTrend('user-1', 30);
      expect(result).toEqual([]);
    });

    it('ProgressRepository.getMeasurements returns [] when db is null', async () => {
      const repo = new ProgressRepository(null as any, {});
      const result = await repo.getMeasurements('user-1');
      expect(result).toEqual([]);
    });

    it('WorkoutRepository.getWorkoutHistory returns [] when db is null', async () => {
      const repo = new WorkoutRepository(null as any, {});
      const result = await repo.getWorkoutHistory('user-1');
      expect(result).toEqual([]);
    });

    it('WorkoutRepository.getWorkouts returns [] when db is null', async () => {
      const repo = new WorkoutRepository(null as any, {});
      const result = await repo.getWorkouts();
      expect(result).toEqual([]);
    });

    it('WorkoutRepository.getPersonalRecords returns [] when db is null', async () => {
      const repo = new WorkoutRepository(null as any, {});
      const result = await repo.getPersonalRecords('user-1');
      expect(result).toEqual([]);
    });

    it('ExerciseRepository.getExerciseById returns null when db is null', async () => {
      const repo = new ExerciseRepository(null as any, {});
      const result = await repo.getExerciseById('ex-1');
      expect(result).toBeNull();
    });

    it('ExerciseRepository.getAlternatives returns [] when db is null', async () => {
      const repo = new ExerciseRepository(null as any, {});
      const result = await repo.getAlternatives('ex-1');
      expect(result).toEqual([]);
    });
  });
});
