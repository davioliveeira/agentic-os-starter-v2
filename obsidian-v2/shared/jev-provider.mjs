export const KEY_SHAPE = /^sk-or-[A-Za-z0-9_-]{10,490}$/;

export function validJevKey(key, backend) {
  if (backend === 'openrouter') return KEY_SHAPE.test(key);
  return backend === 'typesafe' && !key.startsWith('sk-or-') && /^[!-~]{10,500}$/.test(key);
}
