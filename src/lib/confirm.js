export const confirmAction = (opts) => {
  window.dispatchEvent(new CustomEvent("app-confirm", { detail: opts }));
};
