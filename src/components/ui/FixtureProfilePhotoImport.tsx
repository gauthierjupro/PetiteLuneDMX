import React, { useCallback, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Link2, Loader2 } from 'lucide-react';
import { FixtureProfilePhoto } from './FixtureProfilePhoto';
import {
  embedProfileImageFromUrl,
  isEmbeddedProfileImage,
  prepareProfileImageFromClipboard,
  prepareProfileImageFromDataTransfer,
  prepareProfileImageFromFile,
} from '../../utils/fixtureProfileImage';

interface FixtureProfilePhotoImportProps {
  value?: string;
  alt: string;
  onChange: (dataUrl: string | undefined) => void;
}

export function FixtureProfilePhotoImport({
  value,
  alt,
  onChange,
}: FixtureProfilePhotoImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const apply = useCallback(
    async (task: () => Promise<string>) => {
      setBusy(true);
      try {
        onChange(await task());
      } catch (err) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [onChange]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      void apply(async () => {
        const fromDt = await prepareProfileImageFromDataTransfer(e.clipboardData);
        if (fromDt) return fromDt;
        const fromApi = await prepareProfileImageFromClipboard();
        if (fromApi) return fromApi;
        throw new Error('Aucune image dans le presse-papiers — copiez une capture ou une photo.');
      });
    },
    [apply]
  );

  const embedded = value ? isEmbeddedProfileImage(value) : false;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onClick={() => zoneRef.current?.focus()}
        className="relative rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 cursor-pointer"
        title="Cliquez ici puis Ctrl+V pour coller · double-clic pour fichier"
        onDoubleClick={() => fileRef.current?.click()}
      >
        <FixtureProfilePhoto src={value} alt={alt} size="lg" />
        {!value && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/35 text-[9px] font-black uppercase text-center text-white/90 px-2 leading-tight">
            Ctrl+V
            <br />
            capture
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-[200px] space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              zoneRef.current?.focus();
              void apply(async () => {
                const fromApi = await prepareProfileImageFromClipboard();
                if (fromApi) return fromApi;
                throw new Error(
                  'Coller impossible ici — cliquez sur la vignette puis Ctrl+V, ou choisissez un fichier.'
                );
              });
            }}
            className="pl-btn-secondary py-2 px-3 rounded-xl text-[9px] font-black uppercase hover:border-cyan-500/40 hover:text-cyan-400 inline-flex items-center gap-1.5"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Coller
          </button>
          <label className="pl-btn-secondary cursor-pointer py-2 px-3 rounded-xl text-[9px] font-black uppercase hover:border-cyan-500/40 hover:text-cyan-400 inline-flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5" />
            Fichier…
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void apply(() => prepareProfileImageFromFile(file));
              }}
            />
          </label>
          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(undefined)}
              className="pl-btn-secondary py-2 px-3 rounded-xl text-[9px] font-black uppercase text-rose-500 hover:border-rose-500/40"
            >
              Retirer
            </button>
          )}
        </div>

        <p className="text-[9px] text-[var(--pl-muted)] leading-relaxed">
          {embedded
            ? 'Image enregistrée dans le profil (hors ligne, export .pldmx / JSON).'
            : value
              ? 'Lien web — préférez coller ou un fichier pour travailler sans réseau.'
              : 'Capture d’écran ou photo : cliquez la vignette, Ctrl+V. Compressée automatiquement.'}
        </p>

        <button
          type="button"
          className="text-[9px] font-bold uppercase text-[var(--pl-muted)] hover:text-cyan-400"
          onClick={() => setShowUrl((v) => !v)}
        >
          {showUrl ? '− Masquer URL web' : '+ Importer depuis le web (optionnel)'}
        </button>

        {showUrl && (
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-black uppercase text-[var(--pl-muted)] flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              URL https (téléchargée une fois)
            </label>
            <div className="flex gap-2">
              <input
                value={urlDraft}
                placeholder="https://…"
                onChange={(e) => setUrlDraft(e.target.value)}
                className="pl-input flex-1 min-w-0 rounded-xl px-3 py-2 text-xs border focus:border-cyan-500"
              />
              <button
                type="button"
                disabled={busy || !urlDraft.trim()}
                onClick={() =>
                  void apply(async () => {
                    const data = await embedProfileImageFromUrl(urlDraft);
                    setUrlDraft('');
                    setShowUrl(false);
                    return data;
                  })
                }
                className="pl-btn-secondary shrink-0 py-2 px-3 rounded-xl text-[9px] font-black uppercase"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
