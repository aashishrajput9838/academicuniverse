'use client';

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationResultsPanel } from '../ValidationResultsPanel';
import type { ValidationReport } from '@/components/Resume/types/api';

const mockValidReport: ValidationReport = {
  valid: true,
  placeholders: [
    { raw: '{{name}}', key: 'name', location: 'p[0]/r[0]/t[0]', context: 'Full Name' },
    { raw: '{{email}}', key: 'email', location: 'p[1]/r[0]/t[0]', context: 'Email Address' },
  ],
  issues: [],
  summary: {
    total: 2,
    unique: 2,
    duplicates: 0,
    missingRequired: [],
    unknown: [],
    misspelled: [],
    reservedConflicts: [],
  },
};

const mockWarningReport: ValidationReport = {
  valid: false,
  placeholders: [
    { raw: '{{name}}', key: 'name', location: 'p[0]/r[0]/t[0]', context: 'Full Name' },
    { raw: '{{nam}}', key: 'nam', location: 'p[1]/r[0]/t[0]', context: 'Nickname' },
  ],
  issues: [
    {
      severity: 'warning',
      code: 'MISSPELLED',
      placeholder: '{{nam}}',
      message: "Placeholder 'nam' may be misspelled",
      suggestion: 'Did you mean {{name}}?',
      location: 'p[1]/r[0]/t[0]',
    },
  ],
  summary: {
    total: 2,
    unique: 2,
    duplicates: 0,
    missingRequired: [],
    unknown: [],
    misspelled: ['nam'],
    reservedConflicts: [],
  },
};

const mockErrorReport: ValidationReport = {
  valid: false,
  placeholders: [
    { raw: '{{name}}', key: 'name', location: 'p[0]/r[0]/t[0]', context: 'Full Name' },
  ],
  issues: [
    {
      severity: 'error',
      code: 'MISSING',
      placeholder: '{{email}}',
      message: "Required field 'email' is missing from template",
      suggestion: 'Add {{email}} to the appropriate section',
    },
  ],
  summary: {
    total: 1,
    unique: 1,
    duplicates: 0,
    missingRequired: ['email'],
    unknown: [],
    misspelled: [],
    reservedConflicts: [],
  },
};

describe('ValidationResultsPanel', () => {
  it('renders "Ready to Upload" for a valid report', () => {
    render(<ValidationResultsPanel report={mockValidReport} />);
    expect(screen.getByText('Ready to Upload')).toBeInTheDocument();
  });

  it('renders "Warnings Found" for a warning report', () => {
    render(<ValidationResultsPanel report={mockWarningReport} />);
    expect(screen.getByText('Warnings Found')).toBeInTheDocument();
  });

  it('renders "Validation Failed" for an error report', () => {
    render(<ValidationResultsPanel report={mockErrorReport} />);
    expect(screen.getByText('Validation Failed')).toBeInTheDocument();
  });

  it('displays summary counts', () => {
    render(<ValidationResultsPanel report={mockValidReport} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Total Placeholders')).toBeInTheDocument();
  });

  it('renders detected placeholders as badges', () => {
    render(<ValidationResultsPanel report={mockValidReport} />);
    expect(screen.getByText('{{name}}')).toBeInTheDocument();
    expect(screen.getByText('{{email}}')).toBeInTheDocument();
  });

  it('renders issues with severity icons', () => {
    render(<ValidationResultsPanel report={mockWarningReport} />);
    expect(screen.getByText("Placeholder 'nam' may be misspelled")).toBeInTheDocument();
  });

  it('renders suggestions for misspelled placeholders', () => {
    render(<ValidationResultsPanel report={mockWarningReport} />);
    expect(screen.getByText('Did you mean {{name}}?')).toBeInTheDocument();
  });

  it('renders missing required placeholder suggestions', () => {
    render(<ValidationResultsPanel report={mockErrorReport} />);
    expect(screen.getByText('Add {{email}} to the appropriate section.')).toBeInTheDocument();
  });

  it('displays issue code badges', () => {
    render(<ValidationResultsPanel report={mockWarningReport} />);
    expect(screen.getByText('MISSPELLED')).toBeInTheDocument();
  });

  it('displays error count when validation has errors', () => {
    render(<ValidationResultsPanel report={mockErrorReport} />);
    expect(screen.getByText('1 error(s) found.')).toBeInTheDocument();
  });

  it('shows "No issues found" when there are no issues', () => {
    render(<ValidationResultsPanel report={mockValidReport} />);
    expect(screen.getByText('No issues found.')).toBeInTheDocument();
  });

  it('shows "No placeholders detected" when placeholders list is empty', () => {
    const emptyReport: ValidationReport = {
      valid: true,
      placeholders: [],
      issues: [],
      summary: { total: 0, unique: 0, duplicates: 0, missingRequired: [], unknown: [], misspelled: [], reservedConflicts: [] },
    };
    render(<ValidationResultsPanel report={emptyReport} />);
    expect(screen.getByText('No placeholders detected.')).toBeInTheDocument();
  });
});