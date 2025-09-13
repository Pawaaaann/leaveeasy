import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Create stub packages for Replit plugins when deploying outside Replit environment
async function createReplitStubs() {
  if (process.env.REPL_ID) {
    console.log('Running in Replit environment, skipping stub creation');
    return;
  }

  console.log('Creating Replit plugin stubs for external deployment...');

  // Create directories
  await mkdir('node_modules/@replit/vite-plugin-runtime-error-modal/dist', { recursive: true });
  await mkdir('node_modules/@replit/vite-plugin-cartographer/dist', { recursive: true });

  // Create runtime error modal stub
  const runtimeErrorStub = `// Stub for @replit/vite-plugin-runtime-error-modal
export default function viteRuntimeErrorOverlayPlugin() {
  return {
    name: 'replit-runtime-error-modal-stub',
    apply: () => false, // Never apply this stub plugin
  };
}`;

  // Create cartographer stub  
  const cartographerStub = `// Stub for @replit/vite-plugin-cartographer
export function cartographer() {
  return {
    name: '@replit/vite-plugin-cartographer-stub',
    apply: () => false, // Never apply this stub plugin
  };
}

export const version = '0.0.0-stub';`;

  // Create package.json files
  const runtimeErrorPkg = {
    name: '@replit/vite-plugin-runtime-error-modal',
    version: '0.0.0-stub',
    type: 'module',
    main: './dist/index.mjs',
    module: './dist/index.mjs',
    exports: {
      import: './dist/index.mjs'
    }
  };

  const cartographerPkg = {
    name: '@replit/vite-plugin-cartographer',
    version: '0.0.0-stub', 
    type: 'module',
    main: './dist/index.mjs',
    module: './dist/index.mjs',
    exports: {
      import: './dist/index.mjs'
    }
  };

  // Write all files
  await Promise.all([
    writeFile('node_modules/@replit/vite-plugin-runtime-error-modal/dist/index.mjs', runtimeErrorStub),
    writeFile('node_modules/@replit/vite-plugin-runtime-error-modal/package.json', JSON.stringify(runtimeErrorPkg, null, 2)),
    writeFile('node_modules/@replit/vite-plugin-cartographer/dist/index.mjs', cartographerStub),
    writeFile('node_modules/@replit/vite-plugin-cartographer/package.json', JSON.stringify(cartographerPkg, null, 2))
  ]);

  console.log('Replit plugin stubs created successfully');
}

createReplitStubs().catch(console.error);