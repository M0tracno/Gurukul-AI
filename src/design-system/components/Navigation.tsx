/**
 * Navigation — Design-system side navigation.
 *
 * Token-driven vertical navigation for the SaaS-dashboard shell. Renders a
 * list of items with optional icons, active-state highlighting, and a
 * selection callback. Spacing, radius, typography, and colors come from tokens.
 *
 * Requirements: 7.1 (navigation), 7.2, 7.3 (tokens), 7.4 (single style).
 */

import {
  Box,
  type BoxProps,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { forwardRef } from 'react';

import { borderRadius } from '../tokens/borderRadius';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';

export interface NavigationItem {
  /** Stable identifier for the item. */
  id: string;
  /** Visible label. */
  label: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Disable interaction. */
  disabled?: boolean;
}

export interface NavigationProps extends Omit<BoxProps, 'onSelect'> {
  /** Items to render. */
  items: NavigationItem[];
  /** Id of the currently active item. */
  activeId?: string;
  /** Called with the item id when an item is selected. */
  onSelect?: (id: string) => void;
  /** Accessible label for the navigation landmark. */
  'aria-label'?: string;
}

export const Navigation = forwardRef<HTMLElement, NavigationProps>(function Navigation(
  { items, activeId, onSelect, 'aria-label': ariaLabel = 'Main navigation', sx, ...props },
  ref
) {
  return (
    <Box
      ref={ref}
      component="nav"
      aria-label={ariaLabel}
      sx={{ px: `${spacing.sm}px`, py: `${spacing.md}px`, ...sx }}
      {...props}
    >
      <List
        disablePadding
        sx={{ display: 'flex', flexDirection: 'column', gap: `${spacing.xs}px` }}
      >
        {items.map(item => {
          const selected = item.id === activeId;
          return (
            <ListItemButton
              key={item.id}
              selected={selected}
              disabled={item.disabled}
              aria-current={selected ? 'page' : undefined}
              onClick={() => onSelect?.(item.id)}
              sx={{
                borderRadius: `${borderRadius.md}px`,
                px: `${spacing.md}px`,
                py: `${spacing.sm}px`,
                minHeight: '44px',
                transition: 'background-color 150ms ease-in-out',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
                '&:focus-visible': {
                  outline: '3px solid currentColor',
                  outlineOffset: '-2px',
                },
              }}
            >
              {item.icon && (
                <ListItemIcon sx={{ minWidth: spacing.xl, color: 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontFamily: typography.fontFamily.body,
                      fontSize: typography.body2.fontSize,
                      fontWeight: selected ? 600 : 500,
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
});
