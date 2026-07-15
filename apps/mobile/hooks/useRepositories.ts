import { useMemo } from 'react';
import { database } from '../database';
import { supabase } from '../lib/supabase';
import { 
  WorkoutRepository, 
  ExerciseRepository, 
  NutritionRepository, 
  ProgressRepository, 
  UserRepository, 
  HabitRepository,
  MediaRepository,
  AICoachRepository,
  ChallengeRepository,
  NotificationRepository,
  MessagingRepository,
  EventRepository
} from '@yeti/database';

export function useRepositories() {
  return useMemo(() => {
    return {
      workoutRepository: new WorkoutRepository(database, supabase),
      exerciseRepository: new ExerciseRepository(database, supabase),
      nutritionRepository: new NutritionRepository(database, supabase),
      progressRepository: new ProgressRepository(database, supabase),
      userRepository: new UserRepository(database, supabase),
      habitRepository: new HabitRepository(database),
      mediaRepository: new MediaRepository(database, supabase),
      aiCoachRepository: new AICoachRepository(database, supabase),
      challengeRepository: new ChallengeRepository(database, supabase),
      notificationRepository: new NotificationRepository(database, supabase),
      messagingRepository: new MessagingRepository(database, supabase),
      eventRepository: new EventRepository(database, supabase),
    };
  }, []);
}
