import { type ReactNode } from "react";

export const MobileContent = ({ children }: { children: ReactNode }) => (
  <main
    className="max-w-7xl mx-auto px-4 min-h-screen overflow-y-auto"
    style={{
      paddingTop: "calc(3.5rem + env(safe-area-inset-top) + 1rem)",
      paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
    }}
    id="main-content"
  >
    {children}
  </main>
);
