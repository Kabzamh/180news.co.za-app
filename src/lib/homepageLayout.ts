import { useEffect, useState } from 'react';
import { NEWSROOM_PUBLIC_API } from './data';

export const HOME_SECTION_IDS = ['elections','south-africa','politics','business','sport','world','africa','tech','life','opinion'] as const;
export type HomeSectionId = typeof HOME_SECTION_IDS[number];

// Unknown, valid slugs are ignored until the app supports them. Malformed
// payloads fail closed instead of accidentally displaying a disabled block.
export function parseHomepageLayout(value: unknown): HomeSectionId[] {
  if (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) || new Set(value).size !== value.length) throw new Error('Invalid homepage layout');
  const supported = new Set<string>(HOME_SECTION_IDS);
  return value.filter((v): v is HomeSectionId => supported.has(v));
}

export function useHomepageLayout(): HomeSectionId[] {
  // No persisted fallback: stale data could resurrect an editor-disabled block.
  const [layout,setLayout] = useState<HomeSectionId[]>([]);
  useEffect(() => {
    let stopped=false; let timer: ReturnType<typeof setTimeout> | undefined; let controller: AbortController | undefined;
    async function poll() {
      controller = new AbortController();
      try {
        const url = new URL(NEWSROOM_PUBLIC_API); url.searchParams.set('resource','homepage-layout');
        const response = await fetch(url, {cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
        if (!response.ok) throw new Error('Homepage layout unavailable');
        const next = parseHomepageLayout(await response.json());
        if (!stopped) setLayout(next);
      } catch { if (!stopped) setLayout([]); }
      finally { if (!stopped) timer=setTimeout(poll,30000); }
    }
    void poll();
    return () => {stopped=true; controller?.abort(); if(timer) clearTimeout(timer);};
  },[]);
  return layout;
}
