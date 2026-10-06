import { useCallback, useState } from 'react';

export function useStageSelection() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [primaryId, setPrimaryId] = useState<number | null>(null);

  const selectFixture = useCallback((id: number, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        const has = prev.some((x) => Number(x) === Number(id));
        if (has) {
          const next = prev.filter((x) => Number(x) !== Number(id));
          setPrimaryId(next.length ? next[next.length - 1]! : null);
          return next;
        }
        setPrimaryId(id);
        return [...prev, id];
      }
      setPrimaryId(id);
      return [id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setPrimaryId(null);
  }, []);

  const isSelected = useCallback(
    (id: number) => selectedIds.some((x) => Number(x) === Number(id)),
    [selectedIds]
  );

  return {
    selectedIds,
    primaryId,
    selectFixture,
    clearSelection,
    isSelected,
    setSelectedIds,
    setPrimaryId,
  };
}
