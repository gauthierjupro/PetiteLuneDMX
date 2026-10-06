import React from 'react';
import type { Fixture, Group } from '../../../types';
import { ControlSlider } from '../../ui/ControlSlider';
import { WookieLaserLivePanel } from './WookieLaserLivePanel';
import { resolveFixtureChannelDefs } from '../../../utils/fixtureDmxChannels';
import { fixtureIsLyreControllable } from '../../../utils/autoLiveGroups';
import {
  isWookie200R9ChannelFixture,
  wookie200R9FixturesInGroup,
} from '../../../utils/cameoWookie200R';

function sliderColor(label: string): string | undefined {
  const l = label.toLowerCase();
  if (l.includes('red') || l.includes('rouge')) return 'bg-red-500';
  if (l.includes('green') || l.includes('vert')) return 'bg-green-500';
  if (l.includes('blue') || l.includes('bleu')) return 'bg-blue-500';
  if (l.includes('dimmer') || l.includes('intens')) return 'bg-amber-400';
  return undefined;
}

interface SpecialSectionProps {
  specialGroups: Group[];
  fixtures: Fixture[];
  channels: number[];
  updateDmx: (channelIndex0: number, value: number) => void;
  onGoToPatch?: () => void;
}

export function SpecialSection({
  specialGroups,
  fixtures,
  channels,
  updateDmx,
  onGoToPatch,
}: SpecialSectionProps) {
  if (specialGroups.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">
        Groupe « Divers » + case <span className="text-slate-400">Spéciaux</span> au Patch
        (laser seul = détection auto).{' '}
        {onGoToPatch && (
          <button
            type="button"
            onClick={onGoToPatch}
            className="text-[10px] font-black uppercase text-amber-300/90 hover:text-amber-200"
          >
            Ouvrir Patch
          </button>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {specialGroups.map((group) => {
        const groupFixtures = group.fixtureIds
          .map((id) => fixtures.find((f) => f.id === id))
          .filter((f): f is Fixture => f != null);
        const wookieFixtures = wookie200R9FixturesInGroup(group.fixtureIds, fixtures);
        const lyres = groupFixtures.filter((f) => fixtureIsLyreControllable(f));
        const manualFixtures = groupFixtures.filter(
          (f) => !isWookie200R9ChannelFixture(f) && !fixtureIsLyreControllable(f)
        );

        return (
          <div
            key={group.id}
            className="bg-[#111317] border-2 border-amber-500/25 rounded-[2rem] p-5 space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.4)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[80px] pointer-events-none" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 relative z-10">
              {group.name}
            </h3>

            {wookieFixtures.length > 0 && (
              <WookieLaserLivePanel
                fixtures={wookieFixtures}
                channels={channels}
                updateDmx={updateDmx}
              />
            )}

            {lyres.length > 0 && (
              <p className="text-[10px] text-slate-500 border border-white/5 rounded-lg px-3 py-2 relative z-10">
                {lyres.length} lyre(s) dans ce groupe : cochez{' '}
                <span className="text-blue-400">Mouvement</span> au Patch (sans{' '}
                <span className="text-amber-400">Spéciaux</span>) pour les piloter en
                colonne Lyres.
              </p>
            )}

            {manualFixtures.map((fixture) => (
              <div key={fixture.id} className="space-y-3 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {fixture.name}
                  <span className="ml-2 font-mono text-slate-600">@{fixture.address}</span>
                </p>
                {fixture.type === 'Laser' && !isWookie200R9ChannelFixture(fixture) && (
                  <p className="text-[10px] text-slate-600 italic">
                    Profil laser non reconnu — sliders génériques ci-dessous.
                  </p>
                )}
                <div className="space-y-2">
                  {resolveFixtureChannelDefs(fixture).map((def) => {
                    const ch = fixture.address - 1 + (def.index - 1);
                    return (
                      <ControlSlider
                        key={`${fixture.id}-${def.index}`}
                        label={def.name}
                        value={channels[ch] ?? 0}
                        onChange={(v) => updateDmx(ch, Number(v))}
                        color={sliderColor(def.name)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
