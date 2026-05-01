// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('renders with custom class name and custom day class', () => {
    const { container } = render(
      <Calendar
        month={new Date(2026, 3, 1)}
        className="custom-calendar"
        classNames={{ day: 'custom-day' }}
      />
    );

    const root = container.firstElementChild;
    expect(root?.classList.contains('custom-calendar')).toBe(true);

    const dayNodeWithCustomClass = container.querySelector('.custom-day');
    expect(dayNodeWithCustomClass).not.toBeNull();
  });

  it('calls onMonthChange when clicking next month navigation', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();

    const { container } = render(
      <Calendar month={new Date(2026, 3, 1)} onMonthChange={onMonthChange} />
    );

    const nextButton = screen.getByLabelText(/next month/i);
    await user.click(nextButton);

    expect(onMonthChange).toHaveBeenCalledTimes(1);
    const changedMonth = onMonthChange.mock.calls[0]?.[0];
    expect(changedMonth).toBeInstanceOf(Date);
  });

  it('calls onSelect when clicking a day in single selection mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    const { container } = render(
      <Calendar mode="single" month={new Date(2026, 3, 1)} onSelect={onSelect} />
    );

    const dayButton = screen.getByLabelText(/april 15/i);
    await user.click(dayButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const selectedDate = onSelect.mock.calls[0]?.[0];
    expect(selectedDate).toBeInstanceOf(Date);
  });
});
