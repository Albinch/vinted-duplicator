/**
 * Custom build script
 * - Use esbuild for content scripts and background (bundles everything into one file)
 * - Use Vite for popup (React app)
 */

import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, renameSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function buildContentScripts() {
  console.log('Building content scripts with esbuild...');

  await esbuild({
    entryPoints: [
      resolve(root, 'src/content/content.js'),
      resolve(root, 'src/content/content-relist.js'),
      resolve(root, 'src/background/background.js'),
    ],
    bundle: true,
    outdir: resolve(root, 'dist'),
    outbase: resolve(root, 'src'), // Flatten directory structure
    format: 'iife',
    target: 'es2020',
    minify: true,
    sourcemap: false,
  });

  // Move files from subdirectories to dist root
  const filesToMove = [
    { from: resolve(root, 'dist/content/content.js'), to: resolve(root, 'dist/content.js') },
    { from: resolve(root, 'dist/content/content-relist.js'), to: resolve(root, 'dist/contentRelist.js') },
    { from: resolve(root, 'dist/background/background.js'), to: resolve(root, 'dist/background.js') },
  ];

  for (const { from, to } of filesToMove) {
    if (existsSync(from)) {
      renameSync(from, to);
    }
  }

  // Clean up empty directories
  ['content', 'background'].forEach(dir => {
    const dirPath = resolve(root, 'dist', dir);
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true, force: true });
    }
  });

  console.log('✓ Content scripts built');
}

async function buildPopup() {
  console.log('Building popup with Vite...');

  await viteBuild({
    build: {
      outDir: 'dist',
      emptyOutDir: false, // Don't delete content scripts
    },
  });

  console.log('✓ Popup built');
}

async function copyManifest() {
  console.log('Copying manifest...');

  const manifestSrc = resolve(root, 'public/manifest.json');
  const manifestDest = resolve(root, 'dist/manifest.json');

  mkdirSync(resolve(root, 'dist'), { recursive: true });
  copyFileSync(manifestSrc, manifestDest);

  console.log('✓ Manifest copied');
}

async function main() {
  try {
    // Build in sequence
    await buildContentScripts();
    await buildPopup();
    await copyManifest();

    console.log('\n✓ Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();
