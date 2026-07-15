import { useState, useEffect, useSyncExternalStore } from "react";
import { getState, subscribe } from "./store.js";

export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState);
}
