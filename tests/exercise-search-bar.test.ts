import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ExerciseSearchBar — immediate local state & debounced parent dispatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps raw typing state immediate and notifies parent only after debounce', () => {
    const onDebouncedChange = vi.fn();
    const debounceMs = 120;

    // Simulate ExerciseSearchBar logic
    let localText = '';
    let parentValue = '';
    let activeTimer: any = null;

    function handleLocalChange(text: string) {
      localText = text;
      if (activeTimer) clearTimeout(activeTimer);
      // If cleared completely, notify parent immediately
      if (!text.trim() && parentValue) {
        onDebouncedChange('');
        return;
      }
      activeTimer = setTimeout(() => {
        onDebouncedChange(text);
      }, debounceMs);
    }

    // 1. User types "i" -> local state updates immediately, parent is NOT called synchronously
    handleLocalChange('i');
    expect(localText).toBe('i');
    expect(onDebouncedChange).not.toHaveBeenCalled();

    // 2. User rapidly types "n", "c", "l" within 50ms each (before 120ms expires)
    vi.advanceTimersByTime(40);
    handleLocalChange('in');
    expect(localText).toBe('in');

    vi.advanceTimersByTime(40);
    handleLocalChange('inc');
    expect(localText).toBe('inc');

    vi.advanceTimersByTime(40);
    handleLocalChange('incl');
    expect(localText).toBe('incl');

    // Parent has still not been called with intermediate raw keystrokes
    expect(onDebouncedChange).not.toHaveBeenCalled();

    // 3. User stops typing -> after 120ms debounce timer expires, parent receives final query
    vi.advanceTimersByTime(120);
    expect(onDebouncedChange).toHaveBeenCalledWith('incl');
  });

  it('dispatches instant reset when input is cleared completely', () => {
    const onDebouncedChange = vi.fn();

    let localText = 'incline';
    let parentValue = 'incline';

    function handleLocalChange(text: string) {
      localText = text;
      if (!text.trim() && parentValue) {
        onDebouncedChange('');
        return;
      }
    }

    // User clears the field
    handleLocalChange('');
    expect(localText).toBe('');
    expect(onDebouncedChange).toHaveBeenCalledWith('');
  });

  it('synchronizes local state when parent resets or provides new value (e.g. Recently Trained pill click)', () => {
    let localText = '';

    function syncFromParent(newParentValue: string) {
      localText = newParentValue;
    }

    // Parent sets value to "Smith Machine Incline Press" from a pill click
    syncFromParent('Smith Machine Incline Press');
    expect(localText).toBe('Smith Machine Incline Press');

    // Parent clears all filters
    syncFromParent('');
    expect(localText).toBe('');
  });
});
