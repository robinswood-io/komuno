// @vitest-environment jsdom
import React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: () => undefined,
    });
  }
});

describe('ui primitives iteration 2', () => {
  it('renders alert-dialog content with merged classes for title/description/action/cancel', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent className="dialog-content-custom">
          <AlertDialogHeader>
            <AlertDialogTitle className="dialog-title-custom">Delete project</AlertDialogTitle>
            <AlertDialogDescription className="dialog-description-custom">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cancel-custom">Cancel</AlertDialogCancel>
            <AlertDialogAction className="action-custom">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const dialog = screen.getByRole('alertdialog');
    const title = screen.getByText('Delete project');
    const description = screen.getByText('This action cannot be undone.');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const action = screen.getByRole('button', { name: 'Confirm' });

    expect(dialog.className).toContain('dialog-content-custom');
    expect(dialog.className).toContain('max-w-lg');

    expect(title.className).toContain('text-lg');
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('dialog-title-custom');

    expect(description.className).toContain('text-sm');
    expect(description.className).toContain('text-muted-foreground');
    expect(description.className).toContain('dialog-description-custom');

    expect(cancel.className).toContain('cancel-custom');
    expect(cancel.className).toContain('mt-2');

    expect(action.className).toContain('action-custom');
    expect(action.className).toContain('inline-flex');
  });

  it('opens alert-dialog from trigger in uncontrolled mode', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open confirmation</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>Proceed?</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(screen.getByText('Open confirmation'));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Confirm deletion')).toBeTruthy();
    expect(screen.getByText('Proceed?')).toBeTruthy();
  });

  it('renders select primitives with popper position classes and visible options when open', () => {
    render(
      <Select open>
        <SelectTrigger className="trigger-custom" aria-label="Project selector">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent className="content-custom">
          <SelectGroup>
            <SelectLabel className="label-custom">Projects</SelectLabel>
            <SelectItem className="item-alpha" value="alpha">Alpha</SelectItem>
            <SelectSeparator className="separator-custom" />
            <SelectItem className="item-beta" value="beta">Beta</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole('combobox', { name: 'Project selector', hidden: true });
    const content = screen.getByRole('listbox');

    expect(trigger.className).toContain('trigger-custom');
    expect(trigger.className).toContain('h-10');

    expect(content.className).toContain('content-custom');
    expect(content.className).toContain('origin-[--radix-select-content-transform-origin]');
    expect(content.className).toContain('data-[side=bottom]:translate-y-1');

    expect(screen.getByText('Projects').className).toContain('label-custom');
    expect(screen.getByRole('option', { name: 'Alpha' }).className).toContain('item-alpha');
    expect(screen.getByRole('option', { name: 'Beta' }).className).toContain('item-beta');
    expect(document.querySelector('.separator-custom')).not.toBeNull();
  });

  it('renders select content without popper translation tokens when position is item-aligned', () => {
    render(
      <Select open>
        <SelectTrigger aria-label="Status selector">
          <SelectValue placeholder="Pick status" />
        </SelectTrigger>
        <SelectContent position="item-aligned" className="aligned-content">
          <SelectItem value="todo">Todo</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>,
    );

    const content = screen.getByRole('listbox');

    expect(content.className).toContain('aligned-content');
    expect(content.className).not.toContain('data-[side=bottom]:translate-y-1');
    expect(content.className).not.toContain('data-[side=left]:-translate-x-1');
    expect(screen.getByText('Todo')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });
});
