// Commune named in the shared header. It belongs to the deployment (COMMUNE_NAME, read at request time so one image
// serves every mairie); without it the block is hidden, never filled with the library's sample name.

const PREFIX = /^(?:mairie|commune|ville)\s+(?:de(?:\s+|$)|d['’]\s*)/i;
const MAX_LENGTH = 80;

/** The configured commune name, without a leading « Mairie de » / « Commune de », or undefined. */
export function communeName(raw: string | undefined = process.env.COMMUNE_NAME): string | undefined {
  const name = raw?.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(PREFIX, '').trim();
  if (!name || name.length > MAX_LENGTH) return undefined;
  return name;
}
