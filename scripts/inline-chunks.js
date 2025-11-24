/**
 * Post-build script to inline chunk imports in content scripts
 * Chrome extensions don't support ES module imports in content scripts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

function inlineImports(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Match all import statements: import{...}from"./assets/..."
  const importRegex = /import\{([^}]+)\}from"\.\/assets\/([^"]+)"/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(originalContent)) !== null) {
    const [fullMatch, importedVars, chunkFile] = match;
    imports.push({ fullMatch, importedVars, chunkFile });
  }

  // For each import, inline the chunk content
  for (const imp of imports) {
    const chunkPath = resolve(distDir, 'assets', imp.chunkFile);
    let chunkContent = readFileSync(chunkPath, 'utf-8');

    // Remove export statements from chunk
    chunkContent = chunkContent.replace(/export\{[^}]+\};?/g, '');

    // Replace the import with the chunk content wrapped in an IIFE
    const iife = `(function(){${chunkContent}})();`;
    content = content.replace(imp.fullMatch, iife);
  }

  // Write back the modified content
  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Inlined imports in ${filePath}`);
    return true;
  }

  return false;
}

// Process content scripts
const contentScripts = [
  resolve(distDir, 'content.js'),
  resolve(distDir, 'contentRelist.js')
];

console.log('Inlining chunk imports in content scripts...');

let modified = 0;
for (const script of contentScripts) {
  if (inlineImports(script)) {
    modified++;
  }
}

console.log(`✓ Done! Modified ${modified} file(s)`);
