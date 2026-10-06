import { useCallback } from 'react';
import fixturesData from '../data/fixtures_patch.json';
import groupsData from '../data/groups.json';
import type { Fixture, Group } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

export function usePatchStore() {
  const [fixtures, setFixtures] = useJsonLocalStorage<Fixture[]>(
    'dmx_patched_fixtures',
    () => fixturesData as Fixture[]
  );
  const [groups, setGroups] = useJsonLocalStorage<Group[]>(
    'dmx_groups',
    () => groupsData as Group[]
  );

  const getFixtureById = useCallback(
    (id: number | null) => fixtures.find((f) => f.id === id),
    [fixtures]
  );

  const handleRenameGroup = useCallback((groupId: string, newName: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
    );
  }, [setGroups]);

  const handleCreateGroup = useCallback((name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    setGroups((prev) => [
      ...prev,
      { id, name, fixtureIds: [], isAmbiance: false, isMovement: false, isSpecial: false },
    ]);
  }, [setGroups]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, [setGroups]);

  const handleUpdateGroupFixtures = useCallback((groupId: string, fixtureIds: number[]) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, fixtureIds } : g))
    );
  }, [setGroups]);

  const handleToggleGroupAmbiance = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, isAmbiance: !g.isAmbiance } : g
      )
    );
  }, [setGroups]);

  const handleToggleGroupMovement = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, isMovement: !g.isMovement } : g
      )
    );
  }, [setGroups]);

  const handleToggleGroupSpecial = useCallback((groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, isSpecial: !g.isSpecial } : g
      )
    );
  }, [setGroups]);

  const handleUpdateAddress = useCallback((fixtureId: number, newAddress: number) => {
    setFixtures((prev) =>
      prev.map((f) => (f.id === fixtureId ? { ...f, address: newAddress } : f))
    );
  }, [setFixtures]);

  const handleAddFixture = useCallback((newFixture: Omit<Fixture, 'id'> & { id?: number }) => {
    setFixtures((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((f) => f.id)) + 1 : 1;
      return [...prev, { ...newFixture, id: nextId }];
    });
  }, [setFixtures]);

  const handleDeleteFixture = useCallback((id: number) => {
    setFixtures((prev) => prev.filter((f) => f.id !== id));
  }, [setFixtures]);

  return {
    fixtures,
    setFixtures,
    groups,
    setGroups,
    getFixtureById,
    handleRenameGroup,
    handleCreateGroup,
    handleDeleteGroup,
    handleUpdateGroupFixtures,
    handleToggleGroupAmbiance,
    handleToggleGroupMovement,
    handleToggleGroupSpecial,
    handleUpdateAddress,
    handleAddFixture,
    handleDeleteFixture,
  };
}
