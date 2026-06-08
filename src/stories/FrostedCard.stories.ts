import { Meta, StoryObj } from '@storybook/react';
import { FrostedCard } from '../components/common/FrostedCard';
import { Box, Typography } from '@mui/material';
import React from 'react';
const meta = {
  title: 'Components/FrostedCard',
  component: FrostedCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A futuristic glassmorphism card component with neon glow effects and smooth animations.',
      },
    },
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Content to display inside the card',
    },
    glassLevel: {
      control: 'select',
      options: ['light', 'medium', 'dark'],
      description: 'Glass effect intensity',
    },
    neonGlow: {
      control: 'boolean',
      description: 'Enable neon glow effect',
    },
    neonColor: {
      control: 'select',
      options: ['cyan', 'blue', 'orange', 'purple'],
      description: 'Neon color for glow effect',
    },
    animate: {
      control: 'boolean',
      description: 'Whether to animate on mount',
    },
  },
};
export default meta;
type Story = StoryObj;
export const Default = {
  args: {
    children: React.createElement(
      Box,
      { p: 3 },
      React.createElement(Typography, { variant: 'h5', gutterBottom: true }, 'Default Card'),
      React.createElement(
        Typography,
        { variant: 'body1' },
        'This is a basic frosted card with glassmorphism effects.'
      )
    ),
  },
};
export const WithNeonGlow = {
  args: {
    glassLevel: 'medium',
    neonGlow: true,
    neonColor: 'cyan',
    children: React.createElement(
      Box,
      { p: 3 },
      React.createElement(Typography, { variant: 'h5', gutterBottom: true }, 'Neon Glow Card'),
      React.createElement(
        Typography,
        { variant: 'body1' },
        'This card features a neon glow effect perfect for highlighting important content.'
      )
    ),
  },
};
export const GlassVariant = {
  args: {
    glassLevel: 'dark',
    children: React.createElement(
      Box,
      { p: 3 },
      React.createElement(Typography, { variant: 'h5', gutterBottom: true }, 'Glass Card'),
      React.createElement(
        Typography,
        { variant: 'body1' },
        'A more subtle glass effect with enhanced transparency.'
      )
    ),
  },
};
export const Interactive = {
  args: {
    glassLevel: 'medium',
    neonGlow: true,
    neonColor: 'blue',
    animate: true,
    children: React.createElement(
      Box,
      { p: 3, textAlign: 'center' },
      React.createElement(Typography, { variant: 'h4', gutterBottom: true }, '🚀'),
      React.createElement(Typography, { variant: 'h6', gutterBottom: true }, 'Interactive Card'),
      React.createElement(
        Typography,
        { variant: 'body2' },
        'Hover over this card to see the smooth animations and glow effects in action!'
      )
    ),
  },
};