import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityFeedView } from './ActivityFeedView';
import type { ActivityEvent } from '../../types';

describe('ActivityFeedView', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty state when there are no events', () => {
    render(<ActivityFeedView events={[]} onClear={vi.fn()} />);

    expect(screen.getByText('No events yet')).toBeDefined();
  });

  it('keeps following new events when the user is already near the bottom', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    const initialEvents: ActivityEvent[] = [
      { eventType: 'chat.inbound', data: { description: 'first' }, timestamp: 1 },
    ];
    const nextEvents: ActivityEvent[] = [
      ...initialEvents,
      { eventType: 'chat.response', data: { description: 'second' }, timestamp: 2 },
    ];

    const view = render(<ActivityFeedView events={initialEvents} onClear={vi.fn()} />);
    const container = view.getByTestId('activity-feed-scroll-container');

    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 640 });

    scrollSpy.mockClear();
    fireEvent.scroll(container);
    view.rerender(<ActivityFeedView events={nextEvents} onClear={vi.fn()} />);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('does not yank the user back down when they have scrolled up', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    const initialEvents: ActivityEvent[] = [
      { eventType: 'chat.inbound', data: { description: 'first' }, timestamp: 1 },
    ];
    const nextEvents: ActivityEvent[] = [
      ...initialEvents,
      { eventType: 'chat.response', data: { description: 'second' }, timestamp: 2 },
    ];

    const view = render(<ActivityFeedView events={initialEvents} onClear={vi.fn()} />);
    const container = view.getByTestId('activity-feed-scroll-container');

    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 300 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 120 });

    scrollSpy.mockClear();
    fireEvent.scroll(container);
    view.rerender(<ActivityFeedView events={nextEvents} onClear={vi.fn()} />);

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('can switch between live stream and on-chain forum modes', () => {
    render(<ActivityFeedView events={[]} onClear={vi.fn()} />);

    // Click On-Chain Forum tab
    const forumButton = screen.getByRole('button', { name: /On-Chain Forum/i });
    fireEvent.click(forumButton);

    expect(screen.getByPlaceholderText('Search forum...')).toBeDefined();
    expect(screen.getByText('+ New Post')).toBeDefined();
  });

  it('filters on-chain forum posts by topic', () => {
    render(<ActivityFeedView events={[]} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /On-Chain Forum/i }));

    // Click #defi filter chip
    const defiChip = screen.getByRole('button', { name: '#defi' });
    fireEvent.click(defiChip);

    expect(screen.getByText('defi-sentinel.sol')).toBeDefined();
    expect(screen.queryByText('research-agent-1.sol')).toBeNull();
  });

  it('calls onUpvotePost callback when upvoting a post', () => {
    const onUpvote = vi.fn();
    render(<ActivityFeedView events={[]} onClear={vi.fn()} onUpvotePost={onUpvote} />);
    fireEvent.click(screen.getByRole('button', { name: /On-Chain Forum/i }));

    const upvoteButtons = screen.getAllByRole('button', { name: /Upvote/i });
    expect(upvoteButtons.length).toBeGreaterThan(0);
    fireEvent.click(upvoteButtons[0]);

    expect(onUpvote).toHaveBeenCalledTimes(1);
  });

  it('opens new post modal and publishes post', () => {
    const onCreate = vi.fn();
    render(<ActivityFeedView events={[]} onClear={vi.fn()} onCreatePost={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: /On-Chain Forum/i }));

    fireEvent.click(screen.getByText('+ New Post'));
    expect(screen.getByText('Publish On-Chain Feed Post')).toBeDefined();

    const textarea = screen.getByPlaceholderText(/Share findings/i);
    fireEvent.change(textarea, { target: { value: 'Autonomous consensus reached on proposal 42.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Publish to Feed' }));
    expect(onCreate).toHaveBeenCalledWith({
      topic: 'research',
      content: 'Autonomous consensus reached on proposal 42.',
    });
  });
});

