import React from 'react';

import type { StageDecorSettings } from '../../../utils/stageDecorSettings';

import type { StageSceneElement } from '../../../types';

import { stageSceneElementToWorld3D } from '../../../utils/stageWorld';

import {

  isMusicianKind,

  isSpeakerKind,

  isStageSpeakerElementKind,

  isWedgeMonitorKind,

} from '../../../utils/stageSceneElements';

import { isStageAdditiveSelect } from '../../../utils/stageSelectionInput';

import { MusicianFigure, type MusicianRole } from './StageMusicianFigures';

import { StageWedgeMonitor3D } from './StageWedgeMonitor3D';



function kindToMusicianRole(kind: StageSceneElement['kind']): MusicianRole | null {

  if (

    kind === 'vocalist' ||

    kind === 'guitarist' ||

    kind === 'bassist' ||

    kind === 'drummer' ||

    kind === 'keyboardist'

  ) {

    return kind;

  }

  return null;

}



function isVisible(el: StageSceneElement, settings: StageDecorSettings): boolean {

  if (!el.enabled) return false;

  if (isStageSpeakerElementKind(el.kind)) return settings.showSpeakers;

  if (isMusicianKind(el.kind)) return settings.showBandMusicians;

  if (el.kind === 'dj_booth') return settings.showDjBooth;

  return true;

}



function SpeakerStack() {

  return (

    <group>

      <mesh position={[0, 0.9, 0]}>

        <boxGeometry args={[0.9, 1.8, 0.7]} />

        <meshStandardMaterial color="#222" roughness={0.6} metalness={0.3} />

      </mesh>

      <mesh position={[0, 1.85, 0.05]}>

        <cylinderGeometry args={[0.32, 0.32, 0.08, 16]} />

        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.4} />

      </mesh>

    </group>

  );

}



function DjBoothMesh() {

  return (

    <group>

      <mesh>

        <boxGeometry args={[2.2, 0.9, 1]} />

        <meshStandardMaterial color="#2d3748" roughness={0.7} metalness={0.15} />

      </mesh>

      <mesh position={[0, 0.55, 0.2]}>

        <boxGeometry args={[1.4, 0.08, 0.5]} />

        <meshStandardMaterial

          color="#0891b2"

          emissive="#06b6d4"

          emissiveIntensity={0.25}

        />

      </mesh>

    </group>

  );

}



function SceneElementPickRoot({

  el,

  settings,

  selected,

  onSelect,

  hitHeight,

  hitRadius,

  yOffset = 0,

  children,

}: {

  el: StageSceneElement;

  settings: StageDecorSettings;

  selected: boolean;

  onSelect?: (id: string, additive: boolean) => void;

  hitHeight: number;

  hitRadius: number;

  yOffset?: number;

  children: React.ReactNode;

}) {

  const [x, y, z] = stageSceneElementToWorld3D(el, settings);



  return (

    <group

      position={[x, y + yOffset, z]}

      onClick={(e) => {

        e.stopPropagation();

        onSelect?.(el.id, isStageAdditiveSelect(e));

      }}

      onPointerDown={(e) => e.stopPropagation()}

    >

      {selected && (

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>

          <ringGeometry args={[hitRadius * 0.75, hitRadius * 1.05, 32]} />

          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} depthWrite={false} />

        </mesh>

      )}

      <mesh visible={false} position={[0, hitHeight / 2, 0]}>

        <cylinderGeometry args={[hitRadius, hitRadius, hitHeight, 10]} />

      </mesh>

      {children}

    </group>

  );

}



export function StagePlacedElements3D({

  elements,

  settings,

  selectedIds = [],

  onSelect,

}: {

  elements: StageSceneElement[];

  settings: StageDecorSettings;

  selectedIds?: string[];

  onSelect?: (id: string, additive: boolean) => void;

}) {

  const selectedSet = new Set(selectedIds);



  return (

    <group>

      {elements.filter((el) => isVisible(el, settings)).map((el) => {

        const selected = selectedSet.has(el.id);

        const role = kindToMusicianRole(el.kind);



        if (role) {

          return (

            <SceneElementPickRoot

              key={el.id}

              el={el}

              settings={settings}

              selected={selected}

              onSelect={onSelect}

              hitHeight={1.55}

              hitRadius={0.42}

            >

              <MusicianFigure role={role} position={[0, 0, 0]} rotationY={0} label={el.name} />

            </SceneElementPickRoot>

          );

        }

        if (isWedgeMonitorKind(el.kind)) {

          return (

            <SceneElementPickRoot

              key={el.id}

              el={el}

              settings={settings}

              selected={selected}

              onSelect={onSelect}

              hitHeight={0.45}

              hitRadius={0.35}

            >

              <StageWedgeMonitor3D />

            </SceneElementPickRoot>

          );

        }

        if (isSpeakerKind(el.kind)) {

          return (

            <SceneElementPickRoot

              key={el.id}

              el={el}

              settings={settings}

              selected={selected}

              onSelect={onSelect}

              hitHeight={1.85}

              hitRadius={0.55}

            >

              <SpeakerStack />

            </SceneElementPickRoot>

          );

        }

        if (el.kind === 'dj_booth') {

          return (

            <SceneElementPickRoot

              key={el.id}

              el={el}

              settings={settings}

              selected={selected}

              onSelect={onSelect}

              hitHeight={1.1}

              hitRadius={0.65}

              yOffset={0.45}

            >

              <DjBoothMesh />

            </SceneElementPickRoot>

          );

        }

        return null;

      })}

    </group>

  );

}


