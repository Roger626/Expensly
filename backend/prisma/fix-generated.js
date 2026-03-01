/**
 * Post-generation fix script for prisma-class-validator-generator.
 *
 * Problem: prisma-class-validator-generator@6.x generates files using
 * `Prisma.Decimal` and `Prisma.JsonValue`, which are NOT exported from the
 * `Prisma` namespace in @prisma/client v6. They must be imported directly
 * from `@prisma/client/runtime/library`.
 *
 * This script is automatically run after `prisma generate` via the
 * `postprisma:generate` npm script.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'generated', 'models');

const fixes = [
  {
    // Replace: import { Prisma } from "@prisma/client";
    // With:    import { Prisma } from "@prisma/client";
    //          import { Decimal } from "@prisma/client/runtime/library";
    test: /Prisma\.Decimal/,
    transformImport: (content) =>
      content.replace(
        /^import \{ Prisma \} from "@prisma\/client";/m,
        `import { Prisma } from "@prisma/client";\nimport { Decimal } from "@prisma/client/runtime/library";`,
      ),
    transformBody: (content) =>
      content.replace(/Prisma\.Decimal/g, 'Decimal'),
  },
  {
    // Replace: Prisma.JsonValue  ->  JsonValue
    // And add: import type { JsonValue } from "@prisma/client/runtime/library";
    test: /Prisma\.JsonValue/,
    transformImport: (content) =>
      content.replace(
        /^import \{ Prisma \} from "@prisma\/client";/m,
        `import { Prisma } from "@prisma/client";\nimport type { JsonValue } from "@prisma/client/runtime/library";`,
      ),
    transformBody: (content) =>
      content.replace(/Prisma\.JsonValue/g, 'JsonValue'),
  },
];

const files = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.ts'));

let patchedCount = 0;

for (const file of files) {
  const filePath = path.join(MODELS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const fix of fixes) {
    if (fix.test.test(content)) {
      content = fix.transformImport(content);
      content = fix.transformBody(content);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✔ Patched: ${file}`);
    patchedCount++;
  }
}

if (patchedCount === 0) {
  console.log('  ✔ No patches needed.');
} else {
  console.log(`\n  ${patchedCount} file(s) patched successfully.`);
}
