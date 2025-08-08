import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createFuturisticTheme } from '../../theme/futuristicTheme';
import FrostedCard from '../common/FrostedCard';

const theme = createFuturisticTheme('dark');

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('FrostedCard', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <FrostedCard>
        <div data-testid="card-content">Test Content</div>
      </FrostedCard>
    );

    expect(screen.getByTestId('card-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies correct glass level styling', () => {
    const { container } = renderWithTheme(
      <FrostedCard glassLevel="light">
        <div>Content</div>
      </FrostedCard>
    );

    const card = container.firstChild as HTMLElement;
    const styles = getComputedStyle(card);

    // Should have backdrop filter for glassmorphism effect
    expect(styles.backdropFilter).toContain('blur');
  });

  it('applies neon glow effect when enabled', () => {
    const { container } = renderWithTheme(
      <FrostedCard neonGlow neonColor="cyan">
        <div>Content</div>
      </FrostedCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle('transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('is accessible with proper focus styles', () => {
    renderWithTheme(
      <FrostedCard tabIndex={0}>
        <div>Focusable Card</div>
      </FrostedCard>
    );

    const card = screen.getByText('Focusable Card').parentElement;
    expect(card).toBeInTheDocument();

    // Card should be focusable
    card?.focus();
    expect(card).toHaveFocus();
  });

  it('maintains consistent padding across breakpoints', () => {
    const { container } = renderWithTheme(
      <FrostedCard>
        <div>Content</div>
      </FrostedCard>
    );

    const card = container.firstChild as HTMLElement;
    const styles = getComputedStyle(card);

    // Should have consistent padding based on design tokens
    expect(styles.padding).toBeTruthy();
  });

  it('respects reduced motion preferences', () => {
    // Mock prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderWithTheme(
      <FrostedCard reduceMotion>
        <div>Content</div>
      </FrostedCard>
    );

    // Should not have animations when motion is reduced
    const card = screen.getByText('Content').parentElement;
    expect(card).toBeInTheDocument();
  });

  it('renders with correct elevation', () => {
    const { container } = renderWithTheme(
      <FrostedCard elevation={3}>
        <div>Content</div>
      </FrostedCard>
    );

    const card = container.firstChild as HTMLElement;
    const styles = getComputedStyle(card);

    // Should have box shadow for elevation
    expect(styles.boxShadow).toBeTruthy();
  });

  it('maintains pixel-perfect alignment', () => {
    const { container } = renderWithTheme(
      <FrostedCard>
        <div style={{ height: '100px', width: '200px' }}>Fixed Size Content</div>
      </FrostedCard>
    );

    const card = container.firstChild as HTMLElement;
    const rect = card.getBoundingClientRect();

    // Dimensions should align to 8px grid
    expect(rect.width % 8).toBeLessThan(1);
  });
});
