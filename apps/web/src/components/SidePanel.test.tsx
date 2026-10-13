import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SidePanel } from './SidePanel';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open details
      </button>
      {open && (
        <SidePanel title="Details" label="Item" onClose={() => setOpen(false)}>
          <button type="button">Inside</button>
        </SidePanel>
      )}
    </>
  );
}

describe('SidePanel', () => {
  it('focuses its title, closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open details' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Details' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes with the close button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
