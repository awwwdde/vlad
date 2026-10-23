type Tree = { [key: string]: unknown }
/** Existing edits (including empty strings and arrays) win; only absent keys inherit defaults. */
export function mergeDefaults(defaults: Tree, stored: Tree): Tree {
  const result: Tree = { ...defaults }
  for (const [key, value] of Object.entries(stored)) {
    const base = defaults[key]
    result[key] = value && typeof value === 'object' && !Array.isArray(value) && base && typeof base === 'object' && !Array.isArray(base)
      ? mergeDefaults(base as Tree, value as Tree) : value
  }
  return result
}
