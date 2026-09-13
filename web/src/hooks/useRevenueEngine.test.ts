import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRevenueEngine } from './useRevenueEngine';

describe('useRevenueEngine', () => {
  it('initializes with initial transaction and calculates stats', () => {
    const onCredit = vi.fn();
    const { result } = renderHook(() =>
      useRevenueEngine({ onCreditEarnings: onCredit })
    );

    expect(result.current.transactions.length).toBeGreaterThanOrEqual(1);
    expect(result.current.stats.totalEarnedSol).toBeGreaterThan(0);
    expect(result.current.stats.winRate).toBe(99.6);
  });

  it('triggers instant cycle and credits earnings to wallet', async () => {
    const onCredit = vi.fn();
    const { result } = renderHook(() =>
      useRevenueEngine({ onCreditEarnings: onCredit })
    );

    const initialCount = result.current.transactions.length;
    let cycleResult;

    await act(async () => {
      cycleResult = await result.current.triggerInstantCycle();
    });

    expect(cycleResult).toBeTruthy();
    expect(result.current.transactions.length).toBe(initialCount + 1);
    expect(onCredit).toHaveBeenCalled();
  });

  it('toggles active status cleanly', () => {
    const onCredit = vi.fn();
    const { result } = renderHook(() =>
      useRevenueEngine({ onCreditEarnings: onCredit })
    );

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.toggleActive();
    });

    expect(result.current.isActive).toBe(false);
  });
});
