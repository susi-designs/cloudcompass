import {
  EMPTY_STORE,
  MAX_MY_APPS,
  addApp,
  parseStore,
  removeApp,
  setDefaultApp,
  toggleMute,
} from './myCloudCompassStore';

describe('My applications store', () => {
  it('makes the first application added the default', () => {
    const s = addApp(EMPTY_STORE, 'app-a');
    expect(s.apps).toEqual(['app-a']);
    expect(s.defaultApp).toBe('app-a');
    expect(addApp(s, 'app-b').defaultApp).toBe('app-a');
  });

  it(`keeps at most ${MAX_MY_APPS} applications and no duplicates`, () => {
    let s = EMPTY_STORE;
    for (let i = 0; i < MAX_MY_APPS + 3; i += 1) s = addApp(s, `app-${i}`);
    s = addApp(s, 'app-0');
    expect(s.apps).toHaveLength(MAX_MY_APPS);
  });

  it('moves the default when the default application is removed', () => {
    const s = removeApp(addApp(addApp(EMPTY_STORE, 'app-a'), 'app-b'), 'app-a');
    expect(s.apps).toEqual(['app-b']);
    expect(s.defaultApp).toBe('app-b');
    expect(removeApp(s, 'app-b').defaultApp).toBeNull();
  });

  it('adds an application when it is made the default', () => {
    const s = setDefaultApp(addApp(EMPTY_STORE, 'app-a'), 'app-b');
    expect(s.apps).toEqual(['app-a', 'app-b']);
    expect(s.defaultApp).toBe('app-b');
  });

  it('toggles mutes per application', () => {
    let s = toggleMute(EMPTY_STORE, 'app-a', 'budget');
    expect(s.prefs['app-a']).toEqual({ muted: ['budget'] });
    s = toggleMute(s, 'app-a', 'budget');
    expect(s.prefs['app-a']?.muted).toEqual([]);
    expect(s.prefs['app-b']).toBeUndefined();
  });

  it('drops malformed stored values instead of failing', () => {
    expect(parseStore('garbage')).toEqual(EMPTY_STORE);
    const s = parseStore({
      apps: ['app-a', 'app-a', 3],
      defaultApp: 'app-z',
      prefs: { 'app-a': { pinned: ['ai', 'nope'], muted: ['budget', 'nope'] } },
      visits: { 'app-a': { current: { at: 1, seen: [] } }, bad: { current: {} } },
    });
    expect(s.apps).toEqual(['app-a']);
    expect(s.defaultApp).toBeNull();
    // Pins from before the tabbed layout are dropped.
    expect(s.prefs['app-a']).toEqual({ muted: ['budget'] });
    expect(Object.keys(s.visits)).toEqual(['app-a']);
  });
});
