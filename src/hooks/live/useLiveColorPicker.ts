import React from 'react';
import { hsvToRgb, rgbToHsv } from '../../utils/colorUtils';
import { setLocalStorageJsonDebounced } from '../../utils/localStorageDebounced';
import type { Group, RgbColor } from '../../types';

interface UseLiveColorPickerParams {
  groups: Group[];
  getLinkedFixtureIds: () => number[];
  sendColor: (
    fixtureIds: number[],
    r: number,
    g: number,
    b: number,
    groupId?: string,
    isAuto?: boolean,
    wheelValue?: number
  ) => void;
  setCustomPresets: React.Dispatch<
    React.SetStateAction<Record<string, import('../../types').AmbiancePreset>>
  >;
}

/** UI sélecteur couleur (modale, spectrum, teinte, couleurs user). */
export function useLiveColorPicker({
  groups,
  getLinkedFixtureIds,
  sendColor,
  setCustomPresets,
}: UseLiveColorPickerParams) {
  const [userColors, setUserColors] = React.useState<Record<string, RgbColor>>(() => {
    const saved = localStorage.getItem('dmx_user_colors');
    return saved ? JSON.parse(saved) : {};
  });

  const [isColorModalOpen, setIsColorModalOpen] = React.useState(false);
  const [activeColorGroupId, setActiveColorGroupId] = React.useState<string | null>(null);
  const [activeUserColorToEdit, setActiveUserColorToEdit] = React.useState<string | null>(null);
  const [activePresetToEdit, setActivePresetToEdit] = React.useState<string | null>(null);

  const [tempColor, setTempColor] = React.useState<RgbColor>({ r: 255, g: 255, b: 255 });
  const [tempHue, setTempHue] = React.useState(0);
  const [tempSat, setTempSat] = React.useState(100);
  const [tempLum, setTempLum] = React.useState(50);
  const [isDraggingColor, setIsDraggingColor] = React.useState(false);
  const [isDraggingHue, setIsDraggingHue] = React.useState(false);

  const colorWheelRef = React.useRef<HTMLDivElement>(null);
  const hueSliderRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLocalStorageJsonDebounced('dmx_user_colors', userColors);
  }, [userColors]);

  const onUserColorEdit = React.useCallback(
    (id: string, groupId: string | null) => {
      const key = groupId ? `${groupId}_${id}` : `master_${id}`;
      const color = userColors[key] || { r: 255, g: 255, b: 255 };
      const hsv = rgbToHsv(color.r, color.g, color.b);
      setTempColor(color);
      setTempHue(hsv.h);
      setTempSat(hsv.s);
      setTempLum(hsv.v);
      setActiveUserColorToEdit(key);
      setActiveColorGroupId(groupId);
      setIsColorModalOpen(true);
    },
    [userColors]
  );

  const handleSpectrumAction = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!colorWheelRef.current) return;
      const rect = colorWheelRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const y = Math.min(Math.max(0, clientY - rect.top), rect.height);
      const sat = (x / rect.width) * 100;
      const val = 100 - (y / rect.height) * 100;
      setTempSat(sat);
      setTempLum(val);
      setTempColor(hsvToRgb(tempHue, sat, val));
    },
    [tempHue]
  );

  const handleHueAction = React.useCallback(
    (clientX: number) => {
      if (!hueSliderRef.current) return;
      const rect = hueSliderRef.current.getBoundingClientRect();
      const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      const hue = (x / rect.width) * 360;
      setTempHue(hue);
      setTempColor(hsvToRgb(hue, tempSat, tempLum));
    },
    [tempSat, tempLum]
  );

  const getGroupUserColors = React.useCallback(
    (groupId: string | 'master') => ({
      U1: userColors[`${groupId}_U1`] || { r: 255, g: 255, b: 255 },
      U2: userColors[`${groupId}_U2`] || { r: 255, g: 255, b: 255 },
    }),
    [userColors]
  );

  const onColorModalSave = React.useCallback(() => {
    if (activePresetToEdit) {
      setCustomPresets((prev) => ({
        ...prev,
        [activePresetToEdit]: {
          name: `Preset ${activePresetToEdit}`,
          groupStates: {},
        },
      }));
      setActivePresetToEdit(null);
    } else if (activeUserColorToEdit) {
      setUserColors((prev) => ({ ...prev, [activeUserColorToEdit]: tempColor }));
      setActiveUserColorToEdit(null);
    } else {
      const targetIds = activeColorGroupId
        ? groups.find((g) => g.id === activeColorGroupId)?.fixtureIds || []
        : getLinkedFixtureIds();
      sendColor(
        targetIds,
        tempColor.r,
        tempColor.g,
        tempColor.b,
        activeColorGroupId || undefined
      );
    }
    setIsColorModalOpen(false);
  }, [
    activePresetToEdit,
    activeUserColorToEdit,
    tempColor,
    setCustomPresets,
    activeColorGroupId,
    groups,
    getLinkedFixtureIds,
    sendColor,
  ]);

  return {
    userColors,
    setUserColors,
    isColorModalOpen,
    setIsColorModalOpen,
    activeColorGroupId,
    setActiveColorGroupId,
    activeUserColorToEdit,
    activePresetToEdit,
    setActivePresetToEdit,
    tempColor,
    setTempColor,
    tempHue,
    setTempHue,
    tempSat,
    setTempSat,
    tempLum,
    setTempLum,
    isDraggingColor,
    setIsDraggingColor,
    isDraggingHue,
    setIsDraggingHue,
    colorWheelRef,
    hueSliderRef,
    onUserColorEdit,
    handleSpectrumAction,
    handleHueAction,
    getGroupUserColors,
    onColorModalSave,
  };
}
