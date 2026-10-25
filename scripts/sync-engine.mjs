import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * `src/game` ve `src/bots` tek kaynaktır. Supabase Edge Function (Deno)
 * kendi klasörü dışındaki dosyaları deploy etmediği için motorun bir kopyası
 * `supabase/functions/game/` altına üretilir.
 *
 * Bu script:
 *  - src/game/*.ts -> supabase/functions/game/engine/*.ts
 *  - src/bots/index.ts -> supabase/functions/game/bots/index.ts
 *  - göreli importlara Deno'nun istediği `.ts` uzantısını ekler
 *  - `../bots` importunu `../bots/index.ts` olarak düzeltir
 *
 * Kopya dosyaları elle düzenlemeyin; `npm run sync:engine` ile yeniden üretin.
 */

const root = resolve(import.meta.dirname, '..');
const gameSource = resolve(root, 'src/game');
const botsSource = resolve(root, 'src/bots/index.ts');
const functionRoot = resolve(root, 'supabase/functions/game');
const engineDest = resolve(functionRoot, 'engine');
const botsDest = resolve(functionRoot, 'bots');

function addTsExtensions(content) {
  const withFrom = content.replace(
    /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
    (match, prefix, specifier, suffix) => {
      if (/\.[a-zA-Z0-9]+$/.test(specifier)) return match;
      return `${prefix}${specifier}.ts${suffix}`;
    },
  );
  return withFrom.replace(
    /(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g,
    (match, prefix, specifier, suffix) => {
      if (/\.[a-zA-Z0-9]+$/.test(specifier)) return match;
      return `${prefix}${specifier}.ts${suffix}`;
    },
  );
}

function rewriteEngineImports(content) {
  return addTsExtensions(
    content.replace(/from\s+['"]\.\.\/bots['"]/g, "from '../bots/index.ts'"),
  );
}

function rewriteBotImports(content) {
  const rewritten = content.replace(
    /from\s+['"]\.\.\/game\//g,
    "from '../engine/",
  );
  return addTsExtensions(rewritten);
}

function assertNoBareRelativeImports(file, content) {
  const matches = content.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g);
  for (const match of matches) {
    const specifier = match[1];
    if (!/\.[a-zA-Z0-9]+$/.test(specifier)) {
      throw new Error(
        `${file}: göreli import uzantısız kaldı (${specifier}). Script güncellenmeli.`,
      );
    }
  }
}

async function main() {
  await mkdir(dirname(engineDest), { recursive: true });
  await rm(engineDest, { recursive: true, force: true });
  await rm(botsDest, { recursive: true, force: true });
  await mkdir(engineDest, { recursive: true });
  await mkdir(botsDest, { recursive: true });

  const gameFiles = (await readdir(gameSource)).filter((file) =>
    file.endsWith('.ts'),
  );
  if (gameFiles.length === 0) {
    throw new Error('src/game içinde TypeScript dosyası bulunamadı.');
  }

  for (const file of gameFiles) {
    const source = await readFile(resolve(gameSource, file), 'utf8');
    const output = rewriteEngineImports(source);
    assertNoBareRelativeImports(`src/game/${file}`, output);
    await writeFile(resolve(engineDest, file), output, 'utf8');
    console.log(`✓ engine/${file}`);
  }

  const bots = await readFile(botsSource, 'utf8');
  const botsOutput = rewriteBotImports(bots);
  assertNoBareRelativeImports('src/bots/index.ts', botsOutput);
  await writeFile(resolve(botsDest, 'index.ts'), botsOutput, 'utf8');
  console.log('✓ bots/index.ts');

  console.log('Motor kopyası hazır: supabase/functions/game/');
}

main().catch((error) => {
  console.error('Motor eşitleme başarısız:', error);
  process.exitCode = 1;
});
