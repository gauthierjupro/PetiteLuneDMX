/** Multi-sélection plan scène : Ctrl/Cmd ou Shift + clic (convention outils graphiques). */
export function isStageAdditiveSelect(e: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): boolean {
  return e.ctrlKey || e.metaKey || e.shiftKey;
}
