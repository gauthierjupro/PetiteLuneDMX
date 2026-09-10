import { save, open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import {
  PROJECT_EXTENSION,
  applyProjectToLocalStorage,
  collectProjectFromLocalStorage,
  parseProjectJson,
  serializeProject,
} from './projectFile';

export async function exportProjectFile(appVersion: string): Promise<string | null> {
  const path = await save({
    defaultPath: `petitelune-show.${PROJECT_EXTENSION}`,
    filters: [
      {
        name: 'Projet Petitelune DMX',
        extensions: [PROJECT_EXTENSION],
      },
    ],
  });

  if (!path || typeof path !== 'string') {
    return null;
  }

  const project = collectProjectFromLocalStorage(appVersion);
  const content = serializeProject(project);
  await invoke('save_text_file', { path, content });
  return path;
}

export async function importProjectFile(): Promise<{ path: string; keysApplied: number } | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Projet Petitelune DMX',
        extensions: [PROJECT_EXTENSION, 'json'],
      },
    ],
  });

  if (!selected || typeof selected !== 'string') {
    return null;
  }

  const content = await invoke<string>('load_text_file', { path: selected });
  const project = parseProjectJson(content);
  const keysApplied = applyProjectToLocalStorage(project);
  return { path: selected, keysApplied };
}
