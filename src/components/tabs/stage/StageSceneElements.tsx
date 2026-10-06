import React, { useMemo } from 'react';
import type { StageDecorSettings } from '../../../utils/stageDecorSettings';
import { stageDeckBounds, stageRoomBounds } from '../../../utils/stageDecorSettings';
import { computeAudiencePlacements } from '../../../utils/stageAudienceLayout';
import { StageAudienceCrowd3D } from './StageAudienceCrowd3D';
import {
  normalizeStageDeckColor,
  stageDeckEmissiveHex,
} from '../../../utils/stageDeckColor';
import type { StageSceneElement } from '../../../types';
import { StagePlacedElements3D } from './StagePlacedElements3D';

interface StageSceneElementsProps {
  settings: StageDecorSettings;
  sceneElements: StageSceneElement[];
  selectedSceneElementIds?: string[];
  onSelectSceneElement?: (id: string, additive: boolean) => void;
}

/** Silhouettes public + décor scène (inspiré visualiseurs type DMX Desktop). */
export const StageSceneElements = React.memo(function StageSceneElements({
  settings,
  sceneElements,
  selectedSceneElementIds,
  onSelectSceneElement,
}: StageSceneElementsProps) {
  const room = stageRoomBounds(settings);
  const { L, R, back, front, width: wallW, centerX: cx, centerZ: cz } = room;

  const deck = stageDeckBounds(settings);

  const audiencePlacements = useMemo(
    () => computeAudiencePlacements(L, R, front, deck.audienceStartZ),
    [L, R, front, deck.audienceStartZ]
  );

  const deckH = Math.max(0.08, deck.elevation);
  const deckColor = normalizeStageDeckColor(settings.stageDeckColor);
  const deckEmissive = stageDeckEmissiveHex(deckColor);
  const audienceEndZ = front - 0.85;
  const audienceDepthZ = Math.max(0, audienceEndZ - deck.audienceStartZ);
  const audienceCenterZ = deck.audienceStartZ + audienceDepthZ / 2;

  return (
    <group>
      {settings.showAudience && audienceDepthZ > 1 && (
        <group>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[cx, 0.015, audienceCenterZ]}
          >
            <planeGeometry args={[wallW * 0.92, audienceDepthZ * 0.95]} />
            <meshStandardMaterial
              color="#243044"
              roughness={0.92}
              metalness={0}
              emissive="#0f172a"
              emissiveIntensity={0.06}
            />
          </mesh>
          <StageAudienceCrowd3D placements={audiencePlacements} />
        </group>
      )}

      {settings.showStageDeck && deck.depth > 0.2 && (
        <mesh position={[deck.centerX, deckH / 2, deck.centerZ]}>
          <boxGeometry args={[deck.width * 0.98, deckH, deck.depth * 0.98]} />
          <meshStandardMaterial
            color={deckColor}
            roughness={0.75}
            metalness={0.08}
            emissive={deckEmissive}
            emissiveIntensity={0.12}
          />
        </mesh>
      )}

      {settings.showStageDeck && deck.depth > 0.2 && (
        <mesh position={[deck.centerX, deckH + 0.7, deck.centerZ - deck.depth * 0.42]}>
          <boxGeometry args={[0.15, 1.4, 0.15]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.5} />
        </mesh>
      )}

      <StagePlacedElements3D
        elements={sceneElements}
        settings={settings}
        selectedIds={selectedSceneElementIds}
        onSelect={onSelectSceneElement}
      />
    </group>
  );
});
