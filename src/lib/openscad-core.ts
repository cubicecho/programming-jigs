import { createOpenSCAD } from 'openscad-wasm-prebuilt';

export interface RenderResult {
  ok: boolean;
  stl: Uint8Array | null;
  logs: string[];
  ms: number;
}

/**
 * Renders a .scad source to binary STL. Each call makes a fresh WASM instance,
 * because OpenSCAD's main() can only run once per instance.
 */
export async function renderScad(source: string, defines: string[]): Promise<RenderResult> {
  const start = performance.now();
  const logs: string[] = [];
  const openscad = await createOpenSCAD({
    noInitialRun: true,
    print: (s) => logs.push(s),
    printErr: (s) => logs.push(s),
  });
  const wasm = openscad.getInstance();
  wasm.FS.writeFile('/jig.scad', source);
  const args = ['/jig.scad', '--backend=manifold', '--export-format=binstl'];
  for (const d of defines) args.push('-D', d);
  args.push('-o', '/jig.stl');

  let code: number;
  try {
    code = wasm.callMain(args);
  } catch (e) {
    logs.push(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    code = 1;
  }
  let stl: Uint8Array | null = null;
  if (code === 0) {
    try {
      stl = wasm.FS.readFile('/jig.stl', { encoding: 'binary' });
    } catch {
      logs.push('ERROR: OpenSCAD produced no STL');
    }
  }
  return { ok: stl !== null, stl, logs, ms: Math.round(performance.now() - start) };
}
