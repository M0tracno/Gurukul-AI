/**
 * Tests for SkeletonLoaders components and useLoadingTimeout hook.
 *
 * Requirements: 6.6 (skeleton loading states), 6.7 (timeout with retry)
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { DashboardSkeleton } from './DashboardSkeleton';
import { TableSkeleton } from './TableSkeleton';
import { FormSkeleton } from './FormSkeleton';
import { TimeoutError } from './TimeoutError';
import { DataLoadingContainer } from './DataLoadingContainer';
import { useLoadingTimeout } from './useLoadingTimeout';

const theme = createTheme();

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// DashboardSkeleton
// ---------------------------------------------------------------------------

describe('DashboardSkeleton', () => {
  it('renders with accessible loading status', () => {
    renderWithTheme(<DashboardSkeleton />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading dashboard...');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('renders stat card placeholders', () => {
    const { container } = renderWithTheme(<DashboardSkeleton />);
    // Should render 4 stat card papers (plus chart and activity papers)
    const papers = container.querySelectorAll('.MuiPaper-root');
    expect(papers.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// TableSkeleton
// ---------------------------------------------------------------------------

describe('TableSkeleton', () => {
  it('renders with accessible loading status', () => {
    renderWithTheme(<TableSkeleton />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading table data...');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('renders configurable number of rows', () => {
    const { container } = renderWithTheme(<TableSkeleton rows={5} columns={3} />);
    // The table body rows + header = visible skeleton blocks
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FormSkeleton
// ---------------------------------------------------------------------------

describe('FormSkeleton', () => {
  it('renders with accessible loading status', () => {
    renderWithTheme(<FormSkeleton />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading form...');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('renders configurable sections', () => {
    const { container } = renderWithTheme(<FormSkeleton sections={2} fieldsPerSection={4} />);
    const papers = container.querySelectorAll('.MuiPaper-root');
    expect(papers.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe('TimeoutError', () => {
  it('renders an alert role with error message', () => {
    renderWithTheme(<TimeoutError onRetry={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
  });

  it('displays the default timeout message', () => {
    renderWithTheme(<TimeoutError onRetry={vi.fn()} />);
    expect(
      screen.getByText('The request timed out. The server may be slow or unreachable.')
    ).toBeInTheDocument();
  });

  it('displays a custom message when provided', () => {
    renderWithTheme(<TimeoutError onRetry={vi.fn()} message="Custom error text" />);
    expect(screen.getByText('Custom error text')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    renderWithTheme(<TimeoutError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// useLoadingTimeout
// ---------------------------------------------------------------------------

describe('useLoadingTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns isTimedOut = false initially while loading', () => {
    const { result } = renderHook(() => useLoadingTimeout({ isLoading: true, timeoutMs: 10_000 }));
    expect(result.current.isTimedOut).toBe(false);
  });

  it('sets isTimedOut = true after timeout elapses', () => {
    const { result } = renderHook(() => useLoadingTimeout({ isLoading: true, timeoutMs: 10_000 }));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.isTimedOut).toBe(true);
  });

  it('does not time out if loading completes before timeout', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingTimeout({ isLoading, timeoutMs: 10_000 }),
      { initialProps: { isLoading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    rerender({ isLoading: false });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.isTimedOut).toBe(false);
  });

  it('resets when isLoading transitions to false', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingTimeout({ isLoading, timeoutMs: 10_000 }),
      { initialProps: { isLoading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.isTimedOut).toBe(true);

    rerender({ isLoading: false });

    expect(result.current.isTimedOut).toBe(false);
  });

  it('reset() clears timed out state', () => {
    const { result } = renderHook(() => useLoadingTimeout({ isLoading: true, timeoutMs: 10_000 }));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.isTimedOut).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isTimedOut).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DataLoadingContainer
// ---------------------------------------------------------------------------

describe('DataLoadingContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders skeleton when isLoading is true', () => {
    renderWithTheme(
      <DataLoadingContainer
        isLoading={true}
        skeleton={<div data-testid="skeleton">Skeleton</div>}
        onRetry={vi.fn()}
      >
        <div data-testid="content">Content</div>
      </DataLoadingContainer>
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when isLoading is false', () => {
    renderWithTheme(
      <DataLoadingContainer
        isLoading={false}
        skeleton={<div data-testid="skeleton">Skeleton</div>}
        onRetry={vi.fn()}
      >
        <div data-testid="content">Content</div>
      </DataLoadingContainer>
    );

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('shows timeout error after 10 seconds of loading', () => {
    renderWithTheme(
      <DataLoadingContainer
        isLoading={true}
        skeleton={<div data-testid="skeleton">Skeleton</div>}
        onRetry={vi.fn()}
      >
        <div data-testid="content">Content</div>
      </DataLoadingContainer>
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
  });

  it('calls onRetry and resets timeout when retry button is clicked', () => {
    const onRetry = vi.fn();
    renderWithTheme(
      <DataLoadingContainer
        isLoading={true}
        skeleton={<div data-testid="skeleton">Skeleton</div>}
        onRetry={onRetry}
      >
        <div data-testid="content">Content</div>
      </DataLoadingContainer>
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    // After retry, should show skeleton again (timeout reset)
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
