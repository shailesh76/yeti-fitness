import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'meal_logs',
          columns: [
            { name: 'source', type: 'string', isOptional: true },
            { name: 'raw_response', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
