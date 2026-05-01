// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });
}

if (!('scrollIntoView' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: (): void => undefined,
    writable: true,
    configurable: true,
  });
}

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

describe('ui primitives iteration 1', () => {
  it('renders command primitives with custom classes and shortcut', () => {
    render(
      <Command className="cmd-root" data-testid="cmd-root">
        <CommandInput placeholder="Search" className="cmd-input" />
        <CommandList className="cmd-list">
          <CommandEmpty>No result</CommandEmpty>
          <CommandGroup heading="General" className="cmd-group">
            <CommandItem className="cmd-item">Item A<CommandShortcut>⌘A</CommandShortcut></CommandItem>
            <CommandSeparator className="cmd-sep" />
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    expect(screen.getByTestId('cmd-root').className).toContain('cmd-root');
    expect(screen.getByPlaceholderText('Search').className).toContain('cmd-input');
    expect(screen.getByText('Item A')).toBeTruthy();
    expect(screen.getByText('⌘A').className).toContain('text-muted-foreground');
  });

  it('opens dialog and renders header/title/description content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog body</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByText('Open Dialog'));

    expect(screen.getByText('Dialog title')).toBeTruthy();
    expect(screen.getByText('Dialog body')).toBeTruthy();
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('opens sheet and applies side class with header/title/description', () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent side="left" className="sheet-custom">
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText('Open Sheet'));

    const title = screen.getByText('Sheet title');
    const desc = screen.getByText('Sheet description');
    expect(title).toBeTruthy();
    expect(desc).toBeTruthy();

    const sheetPanel = title.closest('[data-state]');
    expect(sheetPanel?.className).toContain('sheet-custom');
    expect(sheetPanel?.className).toContain('left-0');
  });

  it('switches tabs and renders textarea and separator variants', () => {
    const { container } = render(
      <div>
        <Tabs defaultValue="tab1">
          <TabsList className="tabs-list">
            <TabsTrigger value="tab1" className="trigger-1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" className="trigger-2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="content-1">Content 1</TabsContent>
          <TabsContent value="tab2" className="content-2">Content 2</TabsContent>
        </Tabs>

        <Textarea aria-label="note" className="textarea-custom" defaultValue="Hello" />
        <Separator data-testid="sep-h" orientation="horizontal" className="sep-h" />
        <div style={{ height: 20 }}>
          <Separator data-testid="sep-v" orientation="vertical" className="sep-v" decorative={false} />
        </div>
      </div>,
    );

    expect(screen.getByText('Content 1')).toBeTruthy();
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab1.getAttribute('data-state')).toBe('active');
    expect(tab2.getAttribute('data-state')).toBe('inactive');

    expect(screen.getByLabelText('note').className).toContain('textarea-custom');

    const sepH = screen.getByTestId('sep-h');
    const sepV = screen.getByTestId('sep-v');
    expect(sepH.getAttribute('data-orientation')).toBe('horizontal');
    expect(sepV.getAttribute('data-orientation')).toBe('vertical');

    expect(container.querySelector('.sep-h')).not.toBeNull();
    expect(container.querySelector('.sep-v')).not.toBeNull();
  });
});
