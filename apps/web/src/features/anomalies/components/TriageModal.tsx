import { Dropdown, Modal, TextArea } from '@carbon/react';
import type { AnomalyExpectedReason } from '@cloudcompass/types';
import { useState } from 'react';
import { EXPECTED_REASONS, type TriageAction } from '../../../data/anomalies';

/** Triage actions that ask for input before they apply. */
export type TriageModalAction = 'expect' | 'resolve';

interface Props {
  action: TriageModalAction;
  /** Anomalies the action can apply to (already filtered by status). */
  count: number;
  onSubmit: (action: TriageAction) => void;
  onClose: () => void;
}

const plural = (n: number) => `${n} anomal${n === 1 ? 'y' : 'ies'}`;

export function TriageModal({ action, count, onSubmit, onClose }: Props) {
  const [reason, setReason] = useState<AnomalyExpectedReason | null>(null);
  const [note, setNote] = useState('');

  const expect = action === 'expect';
  return (
    <Modal
      open
      size="sm"
      modalLabel="Anomalies"
      modalHeading={expect ? `Mark ${plural(count)} as expected` : `Resolve ${plural(count)}`}
      primaryButtonText={expect ? 'Mark expected' : 'Resolve'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={expect && reason === null}
      onRequestClose={onClose}
      onRequestSubmit={() => {
        if (expect) {
          if (reason) onSubmit({ type: 'expect', reason });
        } else {
          onSubmit({ type: 'resolve', note: note.trim() || null });
        }
      }}
    >
      {expect ? (
        <Dropdown<AnomalyExpectedReason>
          id="cc-expected-reason"
          titleText="Reason"
          helperText="Expected spikes are excluded from unexpected spend and teach detection to ignore similar changes."
          label="Choose a reason"
          items={[...EXPECTED_REASONS]}
          onChange={({ selectedItem }) => setReason(selectedItem ?? null)}
        />
      ) : (
        <TextArea
          id="cc-resolution-note"
          labelText="Resolution note (optional)"
          helperText="What fixed it. Resolving confirms the anomaly was real, which helps tune detection."
          rows={3}
          maxCount={200}
          enableCounter
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
    </Modal>
  );
}
