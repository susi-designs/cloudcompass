import type { CloudProvider, Environment } from '@cloudcompass/types';
import {
  Button,
  DatePicker,
  DatePickerInput,
  FilterableMultiSelect,
  MultiSelect,
} from '@carbon/react';
import { Reset } from '@carbon/icons-react';
import { useMemo } from 'react';
import { toDayKey } from '../data/dates';
import { DATA_END, DATA_START, defaultScope } from '../data/scope';
import { useScope } from '../data/scopeContext';
import type { ScopeDimensions } from '../data/scope';
import { useHierarchy } from '../data/useHierarchy';

interface Option<T extends string = string> {
  id: T;
  text: string;
}

const PROVIDERS: Option<CloudProvider>[] = [
  { id: 'AWS', text: 'AWS' },
  { id: 'Azure', text: 'Azure' },
  { id: 'GCP', text: 'GCP' },
];
const ENVIRONMENTS: Option<Environment>[] = [
  { id: 'PROD', text: 'PROD' },
  { id: 'TEST', text: 'TEST' },
  { id: 'DEV', text: 'DEV' },
];

const toText = (item: Option | null): string => item?.text ?? '';
const ids = <T extends string>(items: readonly Option<T>[]): T[] => items.map((i) => i.id);
const pick = <T extends string>(options: readonly Option<T>[], selected: readonly T[]) =>
  options.filter((o) => selected.includes(o.id));

/** Day key → local-midnight Date, which is what the date picker displays. */
const toLocalDate = (day: string) =>
  new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

/** US-style m/d/Y matches Carbon DatePicker's default `dateFormat`. */
const toPickerString = (day: string) => `${day.slice(5, 7)}/${day.slice(8, 10)}/${day.slice(0, 4)}`;

/**
 * Global scope filters (CLAUDE.md §6 M1): date range, cloud, LOB, application,
 * environment and account. Lower levels only offer options inside the levels above them.
 */
export function ScopeFilterBar() {
  const { scope, setScope, resetScope } = useScope();
  const { lobs, applications, accounts } = useHierarchy();

  const lobOptions = useMemo(() => lobs.map((l) => ({ id: l.id, text: l.name })), [lobs]);
  const appOptions = useMemo(
    () =>
      applications
        .filter(
          (a) =>
            (scope.lobIds.length === 0 || scope.lobIds.includes(a.lobId)) &&
            (scope.providers.length === 0 || scope.providers.includes(a.provider)),
        )
        .map((a) => ({ id: a.id, text: a.name })),
    [applications, scope.lobIds, scope.providers],
  );
  const accountOptions = useMemo(() => {
    const appIds = new Set(appOptions.map((a) => a.id));
    return accounts
      .filter(
        (a) =>
          appIds.has(a.applicationId) &&
          (scope.applicationIds.length === 0 || scope.applicationIds.includes(a.applicationId)) &&
          (scope.environments.length === 0 || scope.environments.includes(a.environment)),
      )
      .map((a) => ({ id: a.id, text: a.name }));
  }, [accounts, appOptions, scope.applicationIds, scope.environments]);

  /** Apply a change and drop any lower-level selections it made invalid. */
  const update = (change: Partial<ScopeDimensions>) => {
    const next = { ...scope, ...change };
    const validApps = applications.filter(
      (a) =>
        (next.lobIds.length === 0 || next.lobIds.includes(a.lobId)) &&
        (next.providers.length === 0 || next.providers.includes(a.provider)),
    );
    const validAppIds = new Set(validApps.map((a) => a.id));
    const applicationIds = next.applicationIds.filter((id) => validAppIds.has(id));
    const validAccountIds = new Set(
      accounts
        .filter(
          (a) =>
            validAppIds.has(a.applicationId) &&
            (applicationIds.length === 0 || applicationIds.includes(a.applicationId)) &&
            (next.environments.length === 0 || next.environments.includes(a.environment)),
        )
        .map((a) => a.id),
    );
    setScope({
      ...change,
      applicationIds,
      accountIds: next.accountIds.filter((id) => validAccountIds.has(id)),
    });
  };

  return (
    <section className="cc-filter-bar" aria-label="Scope filters">
      <DatePicker
        datePickerType="range"
        className="cc-filter-bar__dates"
        value={[toLocalDate(scope.dateRange.start), toLocalDate(scope.dateRange.end)]}
        minDate={toPickerString(DATA_START)}
        maxDate={toPickerString(DATA_END)}
        onChange={(dates: Date[]) => {
          const [start, end] = dates;
          if (start && end) {
            // Flatpickr returns local midnight; convert via local calendar date.
            const local = (d: Date) =>
              toDayKey(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
            setScope({ dateRange: { start: local(start), end: local(end) } });
          }
        }}
      >
        <DatePickerInput
          id="scope-start"
          labelText="Start date"
          placeholder="mm/dd/yyyy"
          size="md"
        />
        <DatePickerInput id="scope-end" labelText="End date" placeholder="mm/dd/yyyy" size="md" />
      </DatePicker>

      <MultiSelect<Option<CloudProvider>>
        id="scope-cloud"
        titleText="Cloud"
        label="All clouds"
        items={PROVIDERS}
        itemToString={toText}
        selectedItems={pick(PROVIDERS, scope.providers)}
        onChange={({ selectedItems }) => update({ providers: ids(selectedItems ?? []) })}
        size="md"
      />
      <FilterableMultiSelect<Option>
        id="scope-lob"
        titleText="Line of business"
        placeholder="All LOBs"
        items={lobOptions}
        itemToString={toText}
        selectedItems={pick(lobOptions, scope.lobIds)}
        onChange={({ selectedItems }) => update({ lobIds: ids(selectedItems ?? []) })}
        size="md"
      />
      <FilterableMultiSelect<Option>
        id="scope-application"
        titleText="Application"
        placeholder="All applications"
        items={appOptions}
        itemToString={toText}
        selectedItems={pick(appOptions, scope.applicationIds)}
        onChange={({ selectedItems }) => update({ applicationIds: ids(selectedItems ?? []) })}
        size="md"
      />
      <MultiSelect<Option<Environment>>
        id="scope-environment"
        titleText="Environment"
        label="All environments"
        items={ENVIRONMENTS}
        itemToString={toText}
        selectedItems={pick(ENVIRONMENTS, scope.environments)}
        onChange={({ selectedItems }) => update({ environments: ids(selectedItems ?? []) })}
        size="md"
      />
      <FilterableMultiSelect<Option>
        id="scope-account"
        titleText="Account"
        placeholder="All accounts"
        items={accountOptions}
        itemToString={toText}
        selectedItems={pick(accountOptions, scope.accountIds)}
        onChange={({ selectedItems }) => update({ accountIds: ids(selectedItems ?? []) })}
        size="md"
      />
      <Button
        kind="ghost"
        size="md"
        renderIcon={Reset}
        className="cc-filter-bar__reset"
        disabled={JSON.stringify(scope) === JSON.stringify(defaultScope())}
        onClick={resetScope}
      >
        Reset
      </Button>
    </section>
  );
}
