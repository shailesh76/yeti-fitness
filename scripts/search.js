async function run() {
  const response = await fetch("https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json");
  const data = await response.json();
  const queries = ['pull', 'bench', 'squat', 'deadlift', 'press', 'lateral', 'curl', 'extension', 'pushdown', 'dip'];
  
  queries.forEach(query => {
    console.log(`=== Matches for "${query}": ===`);
    const matches = data.exercises
      .filter(ex => ex.name.toLowerCase().includes(query))
      .slice(0, 10)
      .map(ex => `${ex.name} (${ex.muscle}) -> ${ex.gifUrl}`);
    console.log(matches.join('\n'));
    console.log('\n');
  });
}
run();
