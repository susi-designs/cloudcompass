import {
  Content,
  Header,
  HeaderContainer,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react';
import { Search, UserAvatar, Light, Asleep } from '@carbon/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../app/navigation';
import { GlobalSearchPanel } from './GlobalSearchPanel';
import { ThemePanel } from './ThemePanel';
import { BrandMark } from './BrandMark';
import { useThemePreference } from './themeContext';
import { UserPanel } from './UserPanel';

type PanelId = 'search' | 'theme' | 'user' | null;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { theme } = useThemePreference();
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const toggle = (id: Exclude<PanelId, null>) => setOpenPanel((cur) => (cur === id ? null : id));
  const close = () => setOpenPanel(null);

  return (
    <>
      <HeaderContainer
        render={({
          isSideNavExpanded,
          onClickSideNavExpand,
        }: {
          isSideNavExpanded: boolean;
          onClickSideNavExpand: () => void;
        }) => (
          <Header aria-label="CloudCompass">
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
              aria-expanded={isSideNavExpanded}
            />
            <HeaderName as={Link} to="/" prefix="" className="cc-brand">
              <BrandMark className="cc-brand__mark" />
              CloudCompass
            </HeaderName>
            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label="Search applications and accounts"
                isActive={openPanel === 'search'}
                onClick={() => toggle('search')}
              >
                <Search size={20} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="Theme"
                isActive={openPanel === 'theme'}
                onClick={() => toggle('theme')}
              >
                {theme === 'g100' ? <Asleep size={20} /> : <Light size={20} />}
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="User menu"
                isActive={openPanel === 'user'}
                onClick={() => toggle('user')}
                tooltipAlignment="end"
              >
                <UserAvatar size={20} />
              </HeaderGlobalAction>
            </HeaderGlobalBar>
            <GlobalSearchPanel expanded={openPanel === 'search'} onClose={close} />
            <ThemePanel expanded={openPanel === 'theme'} />
            <UserPanel expanded={openPanel === 'user'} />
            <SideNav
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              onSideNavBlur={onClickSideNavExpand}
              href="#main-content"
            >
              <SideNavItems>
                {NAV_ITEMS.map((item) => (
                  <SideNavLink
                    key={item.path}
                    as={Link}
                    to={item.path}
                    renderIcon={item.icon}
                    isActive={item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)}
                  >
                    {item.label}
                  </SideNavLink>
                ))}
              </SideNavItems>
            </SideNav>
          </Header>
        )}
      />
      <Content id="main-content" className="cc-content">
        {children}
      </Content>
    </>
  );
}
