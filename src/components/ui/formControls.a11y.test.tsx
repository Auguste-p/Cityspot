// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '../../test/a11y';
import { Badge } from './badge';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Switch } from './switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Textarea } from './textarea';

afterEach(cleanup);

describe('Form controls accessibility (RGAA / axe-core)', () => {
  it('Input paired with a Label via htmlFor/id has no violation', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it('an Input with no associated Label is flagged', async () => {
    const { container } = render(<Input type="text" />);
    const violations = await import('../../test/a11y').then((m) => m.getA11yViolations(container));
    expect(violations.some((v) => v.id === 'label')).toBe(true);
  });

  it('Textarea paired with a Label has no violation', async () => {
    const { container } = render(
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it('a RadioGroup with labelled items has no violation', async () => {
    const { container } = render(
      <RadioGroup defaultValue="public" aria-label="Type de voie">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="public" id="public" />
          <Label htmlFor="public">Voie publique</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="private" id="private" />
          <Label htmlFor="private">Voie privée</Label>
        </div>
      </RadioGroup>,
    );
    await expectNoA11yViolations(container);
  });

  it('a Switch paired with a Label has no violation', async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Switch id="notifications" />
        <Label htmlFor="notifications">Notifications par email</Label>
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it('Tabs with named triggers/panels have no violation', async () => {
    const { container } = render(
      <Tabs defaultValue="in-progress">
        <TabsList>
          <TabsTrigger value="in-progress">En cours</TabsTrigger>
          <TabsTrigger value="done">Terminés</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress">Liste des signalements en cours</TabsContent>
        <TabsContent value="done">Liste des signalements terminés</TabsContent>
      </Tabs>,
    );
    await expectNoA11yViolations(container);
  });

  it('an icon-only Button needs an aria-label to pass', async () => {
    const { container } = render(
      <Button size="icon" aria-label="Supprimer la photo">
        <svg aria-hidden="true" focusable="false" />
      </Button>,
    );
    await expectNoA11yViolations(container);
  });

  it('a Badge used as a status pill has no violation', async () => {
    const { container } = render(<Badge variant="outline">En vote</Badge>);
    await expectNoA11yViolations(container);
  });
});
