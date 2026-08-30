import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Box, Container, CssBaseline, IconButton, Tooltip, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo, useState } from 'react';

import matterbridgeLogo from './assets/matterbridge.svg';
import { createAppTheme, type ThemeMode } from './theme.ts';

const THEME_MODE_KEY = 'themeMode';

/**
 * Reads the initial theme mode from localStorage, falling back to the OS preference.
 *
 * @returns {ThemeMode} The initial theme mode.
 */
function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * The common page header: plugin logo, title and the light/dark theme toggle.
 *
 * @param {object} props - The component props.
 * @param {ThemeMode} props.mode - The active theme mode, for the toggle icon and tooltip.
 * @param {() => void} props.onToggleMode - Handler that toggles between light and dark mode.
 * @returns {JSX.Element} The rendered header.
 */
function Header({ mode, onToggleMode }: { mode: ThemeMode; onToggleMode: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <img src={matterbridgeLogo} alt="Matterbridge" width={64} height={64} />
        <Typography variant="h4" component="h1">
          Matterbridge Security plugin
        </Typography>
      </Box>
      <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconButton onClick={onToggleMode} color="inherit" aria-label="toggle light/dark theme">
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

/**
 * Single-page app for the matterbridge-security plugin frontend.
 *
 * @returns {JSX.Element} The rendered page.
 */
export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_MODE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Header mode={mode} onToggleMode={toggleMode} />
      </Container>
    </ThemeProvider>
  );
}
