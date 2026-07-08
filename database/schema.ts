import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'foods',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'brand', type: 'string', isOptional: true },
        { name: 'calories', type: 'number' },
        { name: 'protein', type: 'number' },
        { name: 'carbs', type: 'number' },
        { name: 'fat', type: 'number' },
        { name: 'serving_size', type: 'string', isOptional: true },
        { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
      ]
    }),
    tableSchema({
      name: 'meal_logs',
      columns: [
        { name: 'food_id', type: 'string', isIndexed: true },
        { name: 'meal_type', type: 'string' }, // BREAKFAST, LUNCH, DINNER, SNACK
        { name: 'servings', type: 'number' },
        { name: 'logged_at', type: 'number' }, // timestamp (ms)
        { name: 'source', type: 'string', isOptional: true },
        { name: 'raw_response', type: 'string', isOptional: true },
      ]
    }),
  ]
});
