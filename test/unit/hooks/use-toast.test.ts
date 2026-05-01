/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reducer, useToast } from '@/hooks/use-toast';

type ReducerState = Parameters<typeof reducer>[0];
type ReducerAction = Parameters<typeof reducer>[1];
type ReducerToast = ReducerState['toasts'][number];
type ToastHandle = ReturnType<ReturnType<typeof useToast>['toast']>;

const buildToast = (
  id: string,
  overrides: Partial<ReducerToast> = {}
): ReducerToast => ({
  id,
  open: true,
  ...overrides,
});

const applyReducer = (state: ReducerState, action: ReducerAction): ReducerState =>
  reducer(state, action);

describe('use-toast reducer and lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });
    unmount();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('handles ADD_TOAST and enforces limit to latest toast', () => {
    const initialState: ReducerState = {
      toasts: [buildToast('existing', { title: 'existing toast' })],
    };
    const action: ReducerAction = {
      type: 'ADD_TOAST',
      toast: buildToast('new', { title: 'new toast' }),
    };

    const nextState = applyReducer(initialState, action);

    expect(nextState.toasts).toHaveLength(1);
    expect(nextState.toasts[0]?.id).toBe('new');
  });

  it('handles UPDATE_TOAST for the matching id only', () => {
    const initialState: ReducerState = {
      toasts: [
        buildToast('first', { title: 'first', open: true }),
        buildToast('second', { title: 'second', open: true }),
      ],
    };
    const action: ReducerAction = {
      type: 'UPDATE_TOAST',
      toast: { id: 'second', title: 'updated second', open: false },
    };

    const nextState = applyReducer(initialState, action);

    expect(nextState.toasts[0]?.title).toBe('first');
    expect(nextState.toasts[1]?.title).toBe('updated second');
    expect(nextState.toasts[1]?.open).toBe(false);
  });

  it('handles DISMISS_TOAST by id and closes only that toast', () => {
    const initialState: ReducerState = {
      toasts: [
        buildToast('first', { open: true }),
        buildToast('second', { open: true }),
      ],
    };
    const action: ReducerAction = {
      type: 'DISMISS_TOAST',
      toastId: 'first',
    };

    const nextState = applyReducer(initialState, action);

    expect(nextState.toasts[0]?.open).toBe(false);
    expect(nextState.toasts[1]?.open).toBe(true);
  });

  it('handles DISMISS_TOAST without id and closes all toasts', () => {
    const initialState: ReducerState = {
      toasts: [buildToast('first', { open: true }), buildToast('second', { open: true })],
    };
    const action: ReducerAction = {
      type: 'DISMISS_TOAST',
    };

    const nextState = applyReducer(initialState, action);

    expect(nextState.toasts.every((toast) => toast.open === false)).toBe(true);
  });

  it('handles REMOVE_TOAST by id and with undefined id', () => {
    const initialState: ReducerState = {
      toasts: [buildToast('first'), buildToast('second')],
    };

    const afterSingleRemove = applyReducer(initialState, {
      type: 'REMOVE_TOAST',
      toastId: 'first',
    });
    expect(afterSingleRemove.toasts).toHaveLength(1);
    expect(afterSingleRemove.toasts[0]?.id).toBe('second');

    const afterRemoveAll = applyReducer(afterSingleRemove, {
      type: 'REMOVE_TOAST',
    });
    expect(afterRemoveAll.toasts).toHaveLength(0);
  });

  it('covers dismiss/remove lifecycle through toast API', () => {
    const { result } = renderHook(() => useToast());
    let handle: ToastHandle | null = null;

    act(() => {
      handle = result.current.toast({ title: 'Lifecycle toast' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.open).toBe(true);

    act(() => {
      handle?.dismiss();
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1_000_000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('dismisses toast when onOpenChange receives false', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Closable toast' });
    });

    const createdToast = result.current.toasts[0];
    expect(createdToast).toBeDefined();
    expect(createdToast?.open).toBe(true);

    act(() => {
      createdToast?.onOpenChange?.(false);
    });

    expect(result.current.toasts[0]?.open).toBe(false);
  });
});
