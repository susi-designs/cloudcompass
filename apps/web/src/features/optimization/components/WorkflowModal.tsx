import { Dropdown, Modal, RadioButton, RadioButtonGroup } from '@carbon/react';
import type { DismissReason } from '@cloudcompass/types';
import { useState } from 'react';
import {
  DISMISS_REASONS,
  SNOOZE_OPTIONS_DAYS,
  type WorkflowAction,
} from '../../../data/optimization';
import { formatCurrency } from '../../../lib/format';

/** Actions that need input or confirmation before they apply. */
export type ModalAction = 'assign' | 'snooze' | 'dismiss' | 'implement';

interface Props {
  action: ModalAction;
  /** Recommendations the action can apply to (already filtered by status). */
  count: number;
  /** Estimated monthly savings of those recommendations (for the implement confirmation). */
  savings: number;
  currency: string;
  owners: string[];
  onSubmit: (action: WorkflowAction) => void;
  onClose: () => void;
}

const plural = (n: number) => `${n} recommendation${n === 1 ? '' : 's'}`;

export function WorkflowModal({
  action,
  count,
  savings,
  currency,
  owners,
  onSubmit,
  onClose,
}: Props) {
  const [owner, setOwner] = useState<string | null>(null);
  const [days, setDays] = useState<number>(SNOOZE_OPTIONS_DAYS[0]);
  const [reason, setReason] = useState<DismissReason | null>(null);

  const config = {
    assign: {
      heading: `Assign ${plural(count)}`,
      primary: 'Assign',
      disabled: owner === null,
      submit: (): WorkflowAction | null => (owner ? { type: 'assign', owner } : null),
    },
    snooze: {
      heading: `Snooze ${plural(count)}`,
      primary: 'Snooze',
      disabled: false,
      submit: (): WorkflowAction => ({ type: 'snooze', days }),
    },
    dismiss: {
      heading: `Dismiss ${plural(count)}`,
      primary: 'Dismiss',
      disabled: reason === null,
      submit: (): WorkflowAction | null => (reason ? { type: 'dismiss', reason } : null),
    },
    implement: {
      heading: `Mark ${plural(count)} as implemented`,
      primary: 'Mark implemented',
      disabled: false,
      submit: (): WorkflowAction => ({ type: 'implement' }),
    },
  }[action];

  return (
    <Modal
      open
      size="sm"
      modalHeading={config.heading}
      modalLabel="Recommendations"
      primaryButtonText={config.primary}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={config.disabled}
      onRequestClose={onClose}
      onRequestSubmit={() => {
        const next = config.submit();
        if (next) onSubmit(next);
      }}
    >
      {action === 'assign' && (
        <Dropdown<string>
          id="cc-assign-owner"
          titleText="Owner"
          helperText="The team accountable for acting on these recommendations."
          label="Choose a team"
          items={owners}
          onChange={({ selectedItem }) => setOwner(selectedItem ?? null)}
        />
      )}
      {action === 'snooze' && (
        <RadioButtonGroup
          legendText="Snooze for"
          name="cc-snooze-days"
          orientation="vertical"
          valueSelected={String(days)}
          onChange={(value) => setDays(Number(value))}
          helperText="Snoozed recommendations return to the inbox after this time."
        >
          {SNOOZE_OPTIONS_DAYS.map((d) => (
            <RadioButton key={d} id={`cc-snooze-${d}`} labelText={`${d} days`} value={String(d)} />
          ))}
        </RadioButtonGroup>
      )}
      {action === 'dismiss' && (
        <Dropdown<DismissReason>
          id="cc-dismiss-reason"
          titleText="Reason"
          helperText="Dismissed recommendations can be reopened later."
          label="Choose a reason"
          items={[...DISMISS_REASONS]}
          onChange={({ selectedItem }) => setReason(selectedItem ?? null)}
        />
      )}
      {action === 'implement' && (
        <p className="cds--type-body-01">
          Savings of {formatCurrency(savings, currency)} a month will be recorded in the savings
          ledger from today. Realized savings start at the estimate until billing data confirms
          them. Implemented recommendations can&apos;t be reopened.
        </p>
      )}
    </Modal>
  );
}
