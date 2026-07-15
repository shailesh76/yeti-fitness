import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);

  // Form State guaranteeing perfect data for the AI Coach
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [days, setDays] = useState('');
  const [environment, setEnvironment] = useState('');
  const [calories, setCalories] = useState('');
  const [diet, setDiet] = useState('');

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      console.log('Completing Onboarding... Writing to AthleteProfile');
      // Navigates to main dashboard
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepIndicator}>STEP {step} OF 5</Text>
      
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Basic Info</Text>
          <Text style={styles.subtitle}>Help Yeti understand your physiology.</Text>
          <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#666" keyboardType="numeric" value={age} onChangeText={setAge} />
          <TextInput style={styles.input} placeholder="Height (cm)" placeholderTextColor="#666" keyboardType="numeric" value={height} onChangeText={setHeight} />
          <TextInput style={styles.input} placeholder="Weight (kg)" placeholderTextColor="#666" keyboardType="numeric" value={weight} onChangeText={setWeight} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity key={g} style={[styles.choiceBtn, { flex: 1, padding: 12 }, gender === g && styles.choiceActive]} onPress={() => setGender(g)}>
                <Text style={[styles.choiceText, { textAlign: 'center' }, gender === g && styles.choiceTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Primary Goal</Text>
          <Text style={styles.subtitle}>What are we focusing on?</Text>
          {['Muscle Gain', 'Fat Loss', 'Strength', 'Maintenance'].map(g => (
            <TouchableOpacity key={g} style={[styles.choiceBtn, goal === g && styles.choiceActive]} onPress={() => setGoal(g)}>
              <Text style={[styles.choiceText, goal === g && styles.choiceTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Experience Level</Text>
          <Text style={styles.subtitle}>This sets your initial volume.</Text>
          {['Beginner', 'Intermediate', 'Advanced'].map(e => (
            <TouchableOpacity key={e} style={[styles.choiceBtn, experience === e && styles.choiceActive]} onPress={() => setExperience(e)}>
              <Text style={[styles.choiceText, experience === e && styles.choiceTextActive]}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 4 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Training Setup</Text>
          <Text style={styles.subtitle}>How often and where?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {['Gym', 'Home'].map(env => (
              <TouchableOpacity key={env} style={[styles.choiceBtn, { flex: 1, padding: 12 }, environment === env && styles.choiceActive]} onPress={() => setEnvironment(env)}>
                <Text style={[styles.choiceText, { textAlign: 'center' }, environment === env && styles.choiceTextActive]}>{env}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {['2 Days', '3 Days', '4 Days', '5+ Days'].map(d => (
            <TouchableOpacity key={d} style={[styles.choiceBtn, days === d && styles.choiceActive]} onPress={() => setDays(d)}>
              <Text style={[styles.choiceText, days === d && styles.choiceTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 5 && (
        <View style={styles.stepContent}>
          <Text style={styles.title}>Nutrition Targets</Text>
          <Text style={styles.subtitle}>Let Yeti calculate your macros.</Text>
          <TextInput style={styles.input} placeholder="Dietary Preference (e.g. Vegan, Keto, Any)" placeholderTextColor="#666" value={diet} onChangeText={setDiet} />
          <TextInput style={styles.input} placeholder="Manual Calories (Optional)" placeholderTextColor="#666" keyboardType="numeric" value={calories} onChangeText={setCalories} />
          <TouchableOpacity style={styles.calcBtn}>
            <Text style={styles.calcText}>Auto-Calculate with Yeti AI 🧠</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextText}>{step === 5 ? 'Generate Dashboard' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60, justifyContent: 'space-between' },
  stepIndicator: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 20 },
  stepContent: { flex: 1 },
  title: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 16, marginBottom: 30 },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  choiceBtn: { backgroundColor: '#111', padding: 20, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  choiceActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a8a' },
  choiceText: { color: '#aaa', fontSize: 16, fontWeight: 'bold' },
  choiceTextActive: { color: '#fff' },
  calcBtn: { backgroundColor: '#111', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#333' },
  calcText: { color: '#3b82f6', fontWeight: 'bold' },
  nextBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  nextText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
