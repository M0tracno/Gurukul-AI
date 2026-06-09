/**
 * Entry point for the visual regression test harness.
 * This renders the ComponentShowcase in isolation for screenshot comparison.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ComponentShowcase } from './ComponentShowcase';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ComponentShowcase />
    </StrictMode>
  );
}
