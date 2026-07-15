export const uid = (p = "id") =>
  p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const nowISO = () => new Date().toISOString();
