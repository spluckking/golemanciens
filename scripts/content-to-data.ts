// Convertit CONTENU.md en données typées : src/data/content.ts.
// À relancer (npm run content) après toute modification validée de CONTENU.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseContenu } from './parseContenu.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const content = parseContenu(readFileSync(join(root, 'CONTENU.md'), 'utf8'));

const out = `// Fichier généré par scripts/content-to-data.ts depuis CONTENU.md.
// Ne pas modifier à la main : modifier CONTENU.md (avec l'accord du parent), puis lancer « npm run content ».
import type { Content } from './types';

export const CONTENT: Content = ${JSON.stringify(content, null, 2)};
`;
writeFileSync(join(root, 'src', 'data', 'content.ts'), out);
console.log(
  `src/data/content.ts : ${content.stories.length} textes, ${content.outros.length} outros, ` +
    `${content.riddles.length} énigmes, ${Object.keys(content.lumibloc).length} répliques de Lumibloc`,
);
