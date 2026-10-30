/// <reference lib="webworker" />
import { renderScad } from './openscad-core';

export interface RenderRequest {
  id: number;
  source: string;
  defines: string[];
}

export interface RenderResponse {
  id: number;
  ok: boolean;
  stl: ArrayBuffer | null;
  logs: string[];
  ms: number;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (e: MessageEvent<RenderRequest>) => {
  const { id, source, defines } = e.data;
  const r = await renderScad(source, defines);
  const stl = r.stl ? (r.stl.slice().buffer as ArrayBuffer) : null;
  const msg: RenderResponse = { id, ok: r.ok, stl, logs: r.logs, ms: r.ms };
  self.postMessage(msg, stl ? [stl] : []);
};
