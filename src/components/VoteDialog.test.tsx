// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { VoteDialog } from './VoteDialog';

afterEach(cleanup);

// Radix Dialog renders its content in a Portal appended to document.body,
// outside RTL's own container — the a11y scan must target document.body.
describe('VoteDialog accessibility (RGAA / axe-core)', () => {
  it('the vote form (default: positive + engagement level) has no violation', async () => {
    render(
      <VoteDialog
        isOpen
        onClose={() => {}}
        onVote={() => {}}
        postTitle="Nid de poule rue Victor Hugo"
        currentVotes={{ positive: 3, negative: 1 }}
      />,
    );

    await screen.findByText('Voter pour le projet');
    await expectNoA11yViolations(document.body);
  });

  it('the "contre" branch (no engagement section) has no violation', async () => {
    render(
      <VoteDialog
        isOpen
        onClose={() => {}}
        onVote={() => {}}
        postTitle="Nid de poule rue Victor Hugo"
        currentVotes={{ positive: 3, negative: 1 }}
      />,
    );

    await screen.findByText('Voter pour le projet');
    fireEvent.click(screen.getByLabelText(/contre ce projet/i));

    await expectNoA11yViolations(document.body);
  });

  it('renders nothing (and no violation) when closed', async () => {
    render(
      <VoteDialog
        isOpen={false}
        onClose={() => {}}
        onVote={() => {}}
        postTitle="Nid de poule rue Victor Hugo"
        currentVotes={{ positive: 3, negative: 1 }}
      />,
    );

    await expectNoA11yViolations(document.body);
  });
});
