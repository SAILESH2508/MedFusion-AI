import { createContext } from 'react';

export const SidebarContext = createContext({
  sidebarContent: null,
  setSidebarContent: () => {},
});
