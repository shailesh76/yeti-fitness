import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        // Legacy v3 migrations setting up base tables
        createTable({
          name: 'profiles',
          columns: [
            { name: 'role_id', type: 'string', isOptional: true },
            { name: 'full_name', type: 'string', isOptional: true },
            { name: 'avatar_url', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'exercises',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'category_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'equipment_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'workouts',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'day_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        // v4 migration: Setup all remaining tables for Next.js, Expo & Sync
        createTable({
          name: 'workout_sessions',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'plan_day_id', type: 'string', isOptional: true },
            { name: 'assignment_id', type: 'string', isOptional: true },
            { name: 'name', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'started_at', type: 'number' },
            { name: 'finished_at', type: 'number', isOptional: true },
            { name: 'duration_seconds', type: 'number', isOptional: true },
            { name: 'total_volume_kg', type: 'number', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'session_sets',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'session_id', type: 'string', isIndexed: true },
            { name: 'session_server_id', type: 'string', isOptional: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'exercise_id', type: 'string' },
            { name: 'exercise_name', type: 'string' },
            { name: 'set_number', type: 'number' },
            { name: 'weight_kg', type: 'number' },
            { name: 'reps', type: 'number' },
            { name: 'rpe', type: 'number', isOptional: true },
            { name: 'tempo', type: 'string', isOptional: true },
            { name: 'rest_seconds', type: 'number', isOptional: true },
            { name: 'is_warmup', type: 'boolean', isOptional: true },
            { name: 'is_dropset', type: 'boolean', isOptional: true },
            { name: 'completed_at', type: 'number' },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'personal_records',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'exercise_id', type: 'string', isIndexed: true },
            { name: 'record_type', type: 'string' },
            { name: 'value', type: 'number' },
            { name: 'achieved_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'foods',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'brand', type: 'string', isOptional: true },
            { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
            { name: 'calories', type: 'number' },
            { name: 'protein', type: 'number' },
            { name: 'carbs', type: 'number' },
            { name: 'fat', type: 'number' },
            { name: 'serving_size', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'meal_logs',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'food_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'meal_type', type: 'string' },
            { name: 'servings', type: 'number' },
            { name: 'logged_at', type: 'number' },
            { name: 'source', type: 'string', isOptional: true },
            { name: 'raw_response', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'measurements',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'weight_kg', type: 'number', isOptional: true },
            { name: 'body_fat_pct', type: 'number', isOptional: true },
            { name: 'chest_cm', type: 'number', isOptional: true },
            { name: 'waist_cm', type: 'number', isOptional: true },
            { name: 'hips_cm', type: 'number', isOptional: true },
            { name: 'arms_cm', type: 'number', isOptional: true },
            { name: 'legs_cm', type: 'number', isOptional: true },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'logged_at', type: 'number' },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'habits',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'target_frequency', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'habit_logs',
          columns: [
            { name: 'habit_id', type: 'string', isIndexed: true },
            { name: 'completed_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'workout_templates',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'category', type: 'string', isOptional: true },
            { name: 'creator_id', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'template_exercises',
          columns: [
            { name: 'template_id', type: 'string', isIndexed: true },
            { name: 'exercise_id', type: 'string', isIndexed: true },
            { name: 'order_index', type: 'number' },
            { name: 'target_sets', type: 'number', isOptional: true },
            { name: 'target_reps', type: 'string', isOptional: true },
            { name: 'target_rpe', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'ai_conversations',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'ai_messages',
          columns: [
            { name: 'conversation_id', type: 'string', isIndexed: true },
            { name: 'role', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'ai_memory',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'category', type: 'string' },
            { name: 'key', type: 'string' },
            { name: 'value', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'ai_usage',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'requests_count', type: 'number' },
            { name: 'date', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'progress_photos',
          columns: [
            { name: 'server_id', type: 'string', isOptional: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'photo_key', type: 'string' },
            { name: 'notes', type: 'string', isOptional: true },
            { name: 'logged_at', type: 'number' },
            { name: 'is_synced', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'program_templates',
          columns: [
            { name: 'org_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'version', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'program_template_exercises',
          columns: [
            { name: 'workout_id', type: 'string', isIndexed: true },
            { name: 'exercise_id', type: 'string' },
            { name: 'order_index', type: 'number' },
            { name: 'target_sets', type: 'number', isOptional: true },
            { name: 'target_reps', type: 'string', isOptional: true },
            { name: 'target_rpe', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'athlete_programs',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'template_id', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'check_ins',
          columns: [
            { name: 'athlete_id', type: 'string', isIndexed: true },
            { name: 'coach_id', type: 'string', isIndexed: true },
            { name: 'weight', type: 'number', isOptional: true },
            { name: 'energy', type: 'number', isOptional: true },
            { name: 'recovery', type: 'number', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'messages',
          columns: [
            { name: 'conversation_id', type: 'string', isIndexed: true },
            { name: 'sender_id', type: 'string', isIndexed: true },
            { name: 'content', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ]
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'workout_sessions',
          columns: [
            { name: 'progression_suggestion', type: 'string', isOptional: true }
          ]
        })
      ]
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'exercises',
          columns: [
            { name: 'body_part', type: 'string', isOptional: true, isIndexed: true },
            { name: 'target_muscle', type: 'string', isOptional: true },
            { name: 'secondary_muscles', type: 'string', isOptional: true },
            { name: 'difficulty', type: 'string', isOptional: true },
            { name: 'media_type', type: 'string', isOptional: true },
            { name: 'thumbnail_url', type: 'string', isOptional: true },
            { name: 'source', type: 'string', isOptional: true },
            { name: 'source_id', type: 'string', isOptional: true },
            { name: 'is_public', type: 'boolean', isOptional: true },
          ]
        })
      ]
    },
    {
      toVersion: 7,
      steps: [
        createTable({ name: 'workout_plans', columns: [
          { name: 'user_id', type: 'string', isOptional: true, isIndexed: true },
          { name: 'coach_id', type: 'string', isOptional: true, isIndexed: true },
          { name: 'name', type: 'string' }, { name: 'notes', type: 'string', isOptional: true },
          { name: 'created_at', type: 'number' }, { name: 'updated_at', type: 'number' },
        ]}),
        createTable({ name: 'plan_days', columns: [
          { name: 'plan_id', type: 'string', isIndexed: true }, { name: 'day_number', type: 'number' },
          { name: 'name', type: 'string', isOptional: true }, { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number' },
        ]}),
        createTable({ name: 'plan_exercises', columns: [
          { name: 'plan_day_id', type: 'string', isIndexed: true }, { name: 'exercise_id', type: 'string', isIndexed: true },
          { name: 'sets', type: 'string', isOptional: true }, { name: 'reps', type: 'string', isOptional: true },
          { name: 'weight', type: 'string', isOptional: true }, { name: 'target_rpe', type: 'number', isOptional: true },
          { name: 'rest_seconds', type: 'number', isOptional: true }, { name: 'notes', type: 'string', isOptional: true },
          { name: 'warmup_sets', type: 'number', isOptional: true }, { name: 'is_dropset', type: 'boolean', isOptional: true },
          { name: 'superset_group', type: 'string', isOptional: true }, { name: 'order_index', type: 'number' },
          { name: 'created_at', type: 'number' }, { name: 'updated_at', type: 'number' },
        ]}),
        createTable({ name: 'assigned_plans', columns: [
          { name: 'plan_id', type: 'string', isIndexed: true }, { name: 'athlete_id', type: 'string', isIndexed: true },
          { name: 'assigned_at', type: 'number' }, { name: 'start_date', type: 'string', isOptional: true },
          { name: 'updated_at', type: 'number' },
        ]}),
      ]
    },
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: 'exercises',
          columns: [
            { name: 'slug', type: 'string', isOptional: true, isIndexed: true },
            { name: 'primary_muscle', type: 'string', isOptional: true, isIndexed: true },
            { name: 'movement_pattern', type: 'string', isOptional: true, isIndexed: true },
            { name: 'unilateral', type: 'boolean', isOptional: true },
            { name: 'setup_instructions', type: 'string', isOptional: true },
            { name: 'execution_instructions', type: 'string', isOptional: true },
            { name: 'breathing', type: 'string', isOptional: true },
            { name: 'coaching_cues', type: 'string', isOptional: true },
            { name: 'common_mistakes', type: 'string', isOptional: true },
            { name: 'safety_notes', type: 'string', isOptional: true },
            { name: 'default_sets', type: 'number', isOptional: true },
            { name: 'default_reps', type: 'number', isOptional: true },
            { name: 'default_reps_prescription', type: 'string', isOptional: true },
            { name: 'tempo', type: 'string', isOptional: true },
          ]
        })
      ]
    }
  ],
});
