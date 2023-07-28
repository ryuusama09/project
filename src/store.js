import { create } from "zustand";

export const useStore = create((set) => ({
  user: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null,
  containerName: null,
  url: null,
  login: (user) => set(() => ({ user })),
  logout: () => {
    set(() => ({ user: null }))
  },
  setContainerName: (name) =>
    set((state) => ({
      containerName: name,
    })),
  setUrl: (url) =>
    set((state) => ({
      url: url,
    })),
}));
