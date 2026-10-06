import React, { useState } from 'react';
import { Layout, FolderOpen, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import type { Fixture, Group, NewFixtureInput } from '../../types';
import { PatchTab, type PatchTabMode } from './PatchTab';
import { DmxConsoleTab } from './DmxConsoleTab';
import { FixturesTab } from './FixturesTab';
import {
  PatchDmxSegmentNav,
  type PatchDmxSegment,
} from './patch/PatchDmxSegmentNav';

export interface PatchDmxTabProps {
  fixtures: Fixture[];
  groups: Group[];
  channels: number[];
  selectedFixture: number | null;
  setSelectedFixture: (id: number | null) => void;
  getFixtureById: (id: number | null) => Fixture | undefined;
  updateDmx: (ch: number, val: string | number) => void;
  onUpdateAddress: (id: number, newAddress: number) => void;
  onAddFixture: (fixture: NewFixtureInput) => void;
  onDeleteFixture: (id: number) => void;
  onIdentify?: (fixtureId: number) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupFixtures: (groupId: string, fixtureIds: number[]) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onToggleGroupAmbiance: (groupId: string) => void;
  onToggleGroupMovement: (groupId: string) => void;
  onToggleGroupSpecial: (groupId: string) => void;
  onEditLibraryProfile?: (fixture: Fixture) => void;
  initialSegment?: PatchDmxSegment;
}

function patchModeForSegment(segment: PatchDmxSegment): PatchTabMode | null {
  if (segment === 'parc') return 'parc';
  if (segment === 'groups') return 'groups';
  if (segment === 'monitor') return 'monitor';
  return null;
}

export function PatchDmxTab({
  initialSegment = 'parc',
  onAddFixture,
  ...rest
}: PatchDmxTabProps) {
  const [segment, setSegment] = useState<PatchDmxSegment>(initialSegment);
  const [requestAddFixture, setRequestAddFixture] = useState(0);

  const handleOpenPdfFolder = async () => {
    try {
      await invoke('open_pdf_folder');
    } catch (error) {
      console.error("Erreur lors de l'ouverture du dossier:", error);
    }
  };

  const patchMode = patchModeForSegment(segment);

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-3 px-3 pb-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Layout className="w-6 h-6 text-cyan-500" />
            Patch &amp; DMX
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
            Parc, groupes, moniteur et console technique
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenPdfFolder}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-xl text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            PDF
          </button>
          {segment === 'parc' && (
            <button
              type="button"
              onClick={() => setRequestAddFixture((n) => n + 1)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          )}
        </div>
      </div>

      <PatchDmxSegmentNav segment={segment} onChange={setSegment} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {patchMode && (
          <PatchTab
            {...rest}
            onAddFixture={onAddFixture}
            mode={patchMode}
            showPageHeader={false}
            openAddFixtureSignal={requestAddFixture}
          />
        )}
        {segment === 'console' && (
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            <DmxConsoleTab
              fixtures={rest.fixtures}
              channels={rest.channels}
              updateDmx={rest.updateDmx}
              onIdentify={rest.onIdentify}
            />
          </div>
        )}
        {segment === 'test' && (
          <FixturesTab
            fixtures={rest.fixtures}
            selectedFixture={rest.selectedFixture}
            setSelectedFixture={rest.setSelectedFixture}
            getFixtureById={rest.getFixtureById}
            channels={rest.channels}
            updateDmx={rest.updateDmx}
            onIdentify={rest.onIdentify}
          />
        )}
      </div>
    </div>
  );
}
