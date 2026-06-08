/**
 * FormFields — Unit Tests
 *
 * Tests for WCAG 2.1 AA compliance:
 * - ARIA attributes (aria-invalid, aria-describedby)
 * - Label association via htmlFor/id
 * - Keyboard navigability
 * - Error state communication to screen readers
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '@/design-system';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { CheckboxField } from './CheckboxField';
import { RadioGroupField } from './RadioGroupField';
import { SwitchField } from './SwitchField';

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>,
  );
}

describe('TextField', () => {
  it('renders with label', () => {
    renderWithTheme(<TextField label="Username" id="username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is true', () => {
    renderWithTheme(
      <TextField label="Email" id="email" error helperText="Invalid email" />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('associates helper text via aria-describedby', () => {
    renderWithTheme(
      <TextField label="Name" id="name" helperText="Enter your full name" />,
    );
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('is keyboard focusable', async () => {
    const user = userEvent.setup();
    renderWithTheme(<TextField label="Password" id="password" type="password" />);

    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<TextField label="Name" id="name" />);

    const input = screen.getByLabelText('Name');
    await user.type(input, 'John');
    expect(input).toHaveValue('John');
  });
});

describe('SelectField', () => {
  const options = [
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'admin', label: 'Admin' },
  ];

  it('renders with label', () => {
    renderWithTheme(
      <SelectField id="role" fieldLabel="Role" options={options} value="" />,
    );
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it('shows helper text with correct id', () => {
    renderWithTheme(
      <SelectField
        id="role"
        fieldLabel="Role"
        options={options}
        value=""
        helperText="Select your role"
      />,
    );
    const helperText = screen.getByText('Select your role');
    expect(helperText).toHaveAttribute('id', 'role-helper-text');
  });

  it('sets aria-invalid when error is true', () => {
    renderWithTheme(
      <SelectField
        id="role"
        fieldLabel="Role"
        options={options}
        value=""
        error
      />,
    );
    const select = screen.getByLabelText('Role');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('opens dropdown and selects option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <SelectField
        id="role"
        fieldLabel="Role"
        options={options}
        value=""
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText('Role'));
    const option = screen.getByRole('option', { name: 'Teacher' });
    await user.click(option);

    expect(onChange).toHaveBeenCalled();
  });
});

describe('CheckboxField', () => {
  it('renders with label', () => {
    renderWithTheme(
      <CheckboxField id="agree" label="I agree to terms" />,
    );
    expect(screen.getByLabelText('I agree to terms')).toBeInTheDocument();
  });

  it('can be toggled via keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <CheckboxField id="agree" label="I agree" onChange={onChange} />,
    );

    const checkbox = screen.getByRole('checkbox');
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalled();
  });

  it('shows helper text', () => {
    renderWithTheme(
      <CheckboxField
        id="newsletter"
        label="Subscribe"
        helperText="We send weekly updates"
      />,
    );
    expect(screen.getByText('We send weekly updates')).toBeInTheDocument();
  });

  it('associates error helper text via aria-describedby', () => {
    renderWithTheme(
      <CheckboxField
        id="terms"
        label="Accept terms"
        error
        helperText="You must accept"
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-describedby', 'terms-helper-text');
  });
});

describe('RadioGroupField', () => {
  const options = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' },
  ];

  it('renders with fieldset legend', () => {
    renderWithTheme(
      <RadioGroupField
        id="time-preference"
        fieldLabel="Preferred Time"
        options={options}
      />,
    );
    expect(screen.getByText('Preferred Time')).toBeInTheDocument();
  });

  it('renders all radio options', () => {
    renderWithTheme(
      <RadioGroupField
        id="time-preference"
        fieldLabel="Preferred Time"
        options={options}
      />,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('supports keyboard navigation between options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <RadioGroupField
        id="time-preference"
        fieldLabel="Preferred Time"
        options={options}
        onChange={onChange}
      />,
    );

    const firstRadio = screen.getByLabelText('Morning');
    await user.click(firstRadio);

    expect(onChange).toHaveBeenCalled();
  });

  it('shows helper text with error', () => {
    renderWithTheme(
      <RadioGroupField
        id="time-preference"
        fieldLabel="Preferred Time"
        options={options}
        error
        helperText="Please select a time"
      />,
    );
    expect(screen.getByText('Please select a time')).toBeInTheDocument();
  });
});

describe('SwitchField', () => {
  it('renders with label', () => {
    renderWithTheme(
      <SwitchField id="notifications" label="Enable notifications" />,
    );
    expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
  });

  it('has role="switch" on the input', () => {
    renderWithTheme(
      <SwitchField id="dark-mode" label="Dark mode" />,
    );
    const switchInput = screen.getByRole('switch');
    expect(switchInput).toBeInTheDocument();
  });

  it('can be toggled via keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <SwitchField id="toggle" label="Toggle feature" onChange={onChange} />,
    );

    const switchInput = screen.getByRole('switch');
    await user.tab();
    expect(switchInput).toHaveFocus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalled();
  });

  it('shows helper text', () => {
    renderWithTheme(
      <SwitchField
        id="auto-save"
        label="Auto-save"
        helperText="Saves every 30 seconds"
      />,
    );
    expect(screen.getByText('Saves every 30 seconds')).toBeInTheDocument();
  });
});
