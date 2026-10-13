import { HeaderPanel, RadioButton, RadioButtonGroup } from '@carbon/react';
import { useThemePreference, type ThemePreference } from './themeContext';

export function ThemePanel({ expanded }: { expanded: boolean }) {
  const { preference, setPreference } = useThemePreference();
  return (
    <HeaderPanel expanded={expanded} aria-label="Theme settings" className="cc-header-panel">
      {expanded && (
        <div className="cc-header-panel__body">
          <RadioButtonGroup
            legendText="Theme"
            name="theme-preference"
            orientation="vertical"
            valueSelected={preference}
            onChange={(value) => setPreference(value as ThemePreference)}
          >
            <RadioButton id="theme-light" labelText="Light" value="light" />
            <RadioButton id="theme-dark" labelText="Dark" value="dark" />
            <RadioButton id="theme-system" labelText="Match system" value="system" />
          </RadioButtonGroup>
        </div>
      )}
    </HeaderPanel>
  );
}
