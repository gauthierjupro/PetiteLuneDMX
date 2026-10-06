import { describe, expect, it } from 'vitest';
import {
  createSceneElement,
  defaultStageSceneElements,
  mergeStageSceneElements,
  suggestSceneElementName,
} from './stageSceneElements';

describe('mergeStageSceneElements', () => {
  it('conserve les éléments ajoutés en plus des défauts', () => {
    const extra = createSceneElement('speaker', defaultStageSceneElements());
    const saved = [...defaultStageSceneElements(), extra];
    const merged = mergeStageSceneElements(saved);
    expect(merged.some((e) => e.id === extra.id)).toBe(true);
    expect(merged.length).toBe(defaultStageSceneElements().length + 1);
  });
});

describe('suggestSceneElementName', () => {
  it('numérote les enceintes', () => {
    const defaults = defaultStageSceneElements();
    expect(suggestSceneElementName('speaker', defaults)).toBe('Enceinte 3');
  });

  it('numérote les retours wedge', () => {
    const defaults = defaultStageSceneElements();
    expect(suggestSceneElementName('wedge_monitor', defaults)).toBe('Retour 3');
  });
});
