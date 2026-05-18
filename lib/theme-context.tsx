"use client";

import * as React from "react";
import { defaultThemeId, themes, type Theme } from "./themes";

export const ThemeContext = React.createContext<Theme>(themes[defaultThemeId]);

export const useTheme = (): Theme => React.useContext(ThemeContext);
