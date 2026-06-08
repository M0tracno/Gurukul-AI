/**
 * ComponentShowcase — Test harness page that renders all shared UI components
 * in various states for visual regression screenshot comparison.
 *
 * This page is only included in development/test builds and serves as the
 * target for Playwright visual regression tests.
 *
 * Validates: Requirements 9.5
 */

import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

import { DataTable, type DataTableColumn } from '../../features/shared/components/DataTable';
import { Button } from '../../features/shared/components/Buttons/Button';
import { IconButton } from '../../features/shared/components/Buttons/IconButton';
import { TextField } from '../../features/shared/components/FormFields/TextField';
import { SelectField } from '../../features/shared/components/FormFields/SelectField';
import { DashboardSkeleton } from '../../features/shared/components/SkeletonLoaders/DashboardSkeleton';
import { TableSkeleton } from '../../features/shared/components/SkeletonLoaders/TableSkeleton';
import { FormSkeleton } from '../../features/shared/components/SkeletonLoaders/FormSkeleton';

const lightTheme = createTheme({ palette: { mode: 'light' } });

interface SampleRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  [key: string]: unknown;
}

const sampleColumns: DataTableColumn<SampleRow>[] = [
  { id: 'name', label: 'Name', sortable: true, minWidth: 150 },
  { id: 'email', label: 'Email', sortable: true, minWidth: 200 },
  { id: 'role', label: 'Role', sortable: true, minWidth: 100 },
  { id: 'status', label: 'Status', minWidth: 100 },
];

const sampleRows: SampleRow[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Teacher', status: 'Active' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Student', status: 'Active' },
  { id: '3', name: 'Carol Davis', email: 'carol@example.com', role: 'Parent', status: 'Inactive' },
  { id: '4', name: 'Dan Wilson', email: 'dan@example.com', role: 'Admin', status: 'Active' },
  { id: '5', name: 'Eve Brown', email: 'eve@example.com', role: 'Student', status: 'Active' },
];

const selectOptions = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'admin', label: 'Admin' },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Box id={id} sx={{ mb: 6, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  );
}

export function ComponentShowcase() {
  const [selectValue, setSelectValue] = useState('');

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Component Library — Visual Regression Showcase
        </Typography>

        {/* DataTable Section */}
        <Section id="section-datatable" title="DataTable">
          <Box id="datatable-default" sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Default state with data</Typography>
            <DataTable
              columns={sampleColumns}
              rows={sampleRows}
              getRowId={(row) => row.id}
              ariaLabel="Sample data table"
              showPagination={true}
              rowsPerPage={5}
            />
          </Box>
          <Box id="datatable-empty" sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Empty state</Typography>
            <DataTable
              columns={sampleColumns}
              rows={[]}
              getRowId={(row) => row.id}
              ariaLabel="Empty data table"
              emptyMessage="No records found"
            />
          </Box>
          <Box id="datatable-loading">
            <Typography variant="subtitle2" gutterBottom>Loading state</Typography>
            <DataTable
              columns={sampleColumns}
              rows={[]}
              getRowId={(row) => row.id}
              ariaLabel="Loading data table"
              loading={true}
            />
          </Box>
        </Section>

        {/* Buttons Section */}
        <Section id="section-buttons" title="Buttons">
          <Box id="buttons-variants" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Button variant="contained" color="primary">Primary</Button>
            <Button variant="contained" color="secondary">Secondary</Button>
            <Button variant="outlined" color="primary">Outlined</Button>
            <Button variant="text" color="primary">Text</Button>
            <Button variant="contained" color="error">Error</Button>
            <Button variant="contained" color="success">Success</Button>
          </Box>
          <Box id="buttons-sizes" sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <Button variant="contained" size="small">Small</Button>
            <Button variant="contained" size="medium">Medium</Button>
            <Button variant="contained" size="large">Large</Button>
          </Box>
          <Box id="buttons-states" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Button variant="contained" disabled>Disabled</Button>
            <Button variant="contained" loading>Loading</Button>
            <Button variant="outlined" disabled>Outlined Disabled</Button>
          </Box>
          <Box id="buttons-icon" sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <IconButton aria-label="Delete item"><DeleteIcon /></IconButton>
            <IconButton aria-label="Edit item"><EditIcon /></IconButton>
            <IconButton aria-label="Add item" color="primary"><AddIcon /></IconButton>
            <IconButton aria-label="Disabled action" disabled><DeleteIcon /></IconButton>
          </Box>
        </Section>

        {/* FormFields Section */}
        <Section id="section-formfields" title="Form Fields">
          <Box id="formfields-textfield" sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4, maxWidth: 400 }}>
            <TextField id="tf-default" label="Default" placeholder="Enter text..." />
            <TextField id="tf-filled" label="With value" defaultValue="Hello, World!" />
            <TextField id="tf-error" label="Error state" error helperText="This field is required" />
            <TextField id="tf-disabled" label="Disabled" disabled defaultValue="Cannot edit" />
            <TextField id="tf-multiline" label="Multiline" multiline rows={3} placeholder="Enter description..." />
          </Box>
          <Box id="formfields-select" sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400 }}>
            <SelectField
              id="select-default"
              fieldLabel="Role"
              options={selectOptions}
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value as string)}
            />
            <SelectField
              id="select-error"
              fieldLabel="Required Select"
              options={selectOptions}
              value=""
              error
              helperText="Please select a role"
            />
            <SelectField
              id="select-disabled"
              fieldLabel="Disabled"
              options={selectOptions}
              value="teacher"
              disabled
            />
          </Box>
        </Section>

        {/* Skeleton Loaders Section */}
        <Section id="section-skeletons" title="Skeleton Loaders">
          <Box id="skeleton-dashboard" sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Dashboard Skeleton</Typography>
            <DashboardSkeleton />
          </Box>
          <Box id="skeleton-table" sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>Table Skeleton</Typography>
            <TableSkeleton columns={4} rows={5} />
          </Box>
          <Box id="skeleton-form">
            <Typography variant="subtitle2" gutterBottom>Form Skeleton</Typography>
            <FormSkeleton sections={2} fieldsPerSection={3} />
          </Box>
        </Section>
      </Box>
    </ThemeProvider>
  );
}
