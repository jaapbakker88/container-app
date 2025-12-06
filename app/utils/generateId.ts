export function generateId(length = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function isValidContainerId(id: string) {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(id);
}
