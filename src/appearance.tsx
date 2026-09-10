import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";

declare global {
  interface Window {
    __OPENBASE_APPEARANCE__?: {
      setTheme: (theme: string) => void;
    };
  }
}

function NativeAppearance() {
  const { theme } = useTheme();
  useEffect(() => {
    if (theme) window.__OPENBASE_APPEARANCE__?.setTheme(theme);
  }, [theme]);
  return null;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      storageKey="openbase-appearance"
      defaultTheme="light"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
    >
      <NativeAppearance />
      {children}
    </ThemeProvider>
  );
}
