'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Member {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
}

interface MemberSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  members: Member[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

export function MemberSearchSelect({
  value,
  onValueChange,
  members,
  placeholder = 'Sélectionner un membre...',
  disabled,
  className,
  hasError,
}: MemberSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = members.find((m) => m.email === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            hasError && 'border-destructive',
            className
          )}
        >
          {selected
            ? `${selected.firstName} ${selected.lastName}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un membre..." />
          <CommandList>
            <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.email}
                  value={`${member.firstName} ${member.lastName} ${member.email}`}
                  onSelect={() => {
                    onValueChange(member.email);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === member.email ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{member.firstName} {member.lastName}</span>
                  <span className="ml-1 text-xs text-muted-foreground">({member.email})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
