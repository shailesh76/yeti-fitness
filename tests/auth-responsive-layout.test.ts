import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Responsive Auth Layout & Viewport Regression Tests
 *
 * Ensures Yeti auth screen satisfies responsive mobile Safari / PWA contracts:
 * 1. Minimum touch targets >= 48px for primary actions and inputs
 * 2. Proper ScrollView + KeyboardAvoidingView hierarchy for dynamic viewport scrolling
 * 3. Content grows to center in available space without forcing a second viewport height
 * 4. Responsive width constraints prevent horizontal overflow
 */

describe('Auth Screen Responsive Layout Contracts', () => {
  const authFilePath = path.resolve(__dirname, '../apps/mobile/app/auth.tsx');
  const authSource = fs.readFileSync(authFilePath, 'utf-8');

  it('includes ScrollView and KeyboardAvoidingView layout wrappers', () => {
    expect(authSource).toContain('ScrollView');
    expect(authSource).toContain('KeyboardAvoidingView');
    expect(authSource).toContain('contentContainerStyle={styles.scrollContent}');
    expect(authSource).toContain('keyboardShouldPersistTaps="handled"');
  });

  it('uses the actual ScrollView viewport without forcing an oversized 100dvh content box', () => {
    const safeAreaIndex = authSource.indexOf('<SafeAreaView');
    const keyboardIndex = authSource.indexOf('<KeyboardAvoidingView');
    const scrollIndex = authSource.indexOf('<ScrollView');
    const cardIndex = authSource.indexOf('<Animated.View', scrollIndex);

    expect(safeAreaIndex).toBeGreaterThan(-1);
    expect(keyboardIndex).toBeGreaterThan(safeAreaIndex);
    expect(scrollIndex).toBeGreaterThan(keyboardIndex);
    expect(cardIndex).toBeGreaterThan(scrollIndex);
    expect(authSource).toMatch(/scrollContent:\s*\{[\s\S]*?flexGrow:\s*1/);
    expect(authSource).not.toContain('100dvh');
  });

  it('neutralizes card bottom margin to prevent asymmetric vertical offset', () => {
    expect(authSource).toContain('marginBottom: 0');
  });

  it('enforces 48px touch targets for inputs and every primary auth action', () => {
    for (const styleName of ['textInput', 'loginBtn', 'signUpBtn', 'googleBtn']) {
      expect(authSource).toMatch(new RegExp(`${styleName}:\\s*\\{[\\s\\S]*?minHeight:\\s*48`));
    }
  });

  it('keeps the card responsive without introducing horizontal overflow', () => {
    expect(authSource).toMatch(/scrollContent:\s*\{[\s\S]*?paddingHorizontal:\s*20/);
    expect(authSource).toMatch(/card:\s*\{[\s\S]*?width:\s*'100%'[\s\S]*?maxWidth:\s*400/);
  });
});
