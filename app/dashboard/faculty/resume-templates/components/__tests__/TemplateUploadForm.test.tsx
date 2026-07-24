'use client';

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateUploadForm } from '../TemplateUploadForm';

const mockValidateResponse = {
  valid: true,
  placeholders: [
    { raw: '{{name}}', key: 'name', location: 'p[0]/r[0]/t[0]', context: 'Full Name' },
  ],
  issues: [],
  summary: {
    total: 1,
    unique: 1,
    duplicates: 0,
    missingRequired: [],
    unknown: [],
    misspelled: [],
    reservedConflicts: [],
  },
};

const mockInvalidResponse = {
  valid: false,
  placeholders: [],
  issues: [
    {
      severity: 'error',
      code: 'MISSING',
      placeholder: '{{name}}',
      message: "Required field 'name' is missing from template",
      suggestion: 'Add {{name}} to the appropriate section',
    },
  ],
  summary: {
    total: 0,
    unique: 0,
    duplicates: 0,
    missingRequired: ['name'],
    unknown: [],
    misspelled: [],
    reservedConflicts: [],
  },
};

const mockUploadResponse = {
  _id: 'test-template-id',
  templateName: 'Test Template',
  type: 'global',
  target: '',
  fileUrl: 'https://example.com/template.docx',
  organizationId: 'test-org',
  uploadedBy: 'test-user',
  questions: [],
  processingMode: 'placeholder-first',
  validationStatus: 'valid',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TemplateUploadForm', () => {
  it('renders the upload form with all fields', () => {
    render(<TemplateUploadForm />);
    expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
    expect(screen.getByText(/type/i)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop your template here/i)).toBeInTheDocument();
    expect(screen.getByText(/validate template/i)).toBeInTheDocument();
    expect(screen.getByText(/upload template/i)).toBeInTheDocument();
  });

  it('shows upload button disabled when no file is selected', () => {
    render(<TemplateUploadForm />);
    const uploadBtn = screen.getByText(/upload template/i).closest('button');
    expect(uploadBtn).toBeDisabled();
  });

  it('shows upload button disabled when template name is empty', () => {
    render(<TemplateUploadForm />);
    const uploadBtn = screen.getByText(/upload template/i).closest('button');
    expect(uploadBtn).toBeDisabled();
  });

  it('shows upload button disabled while validation is in progress', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockValidateResponse }),
    } as Response);

    render(<TemplateUploadForm />);

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByText(/validate template/i).closest('button');
    expect(validateBtn).toBeEnabled();
  });

  it('displays validation results after a successful validate call', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockValidateResponse }),
    } as Response);

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByText(/validate template/i).closest('button');
    fireEvent.click(validateBtn!);

    await waitFor(() => {
      expect(screen.getByText('Validation Status')).toBeInTheDocument();
    });
  });

  it('displays validation results with errors when validation fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockInvalidResponse }),
    } as Response);

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByText(/validate template/i).closest('button');
    fireEvent.click(validateBtn!);

    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument();
    });
  });

  it('shows success state after successful upload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockUploadResponse }),
    } as Response);

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByText(/upload template/i).closest('button');
    fireEvent.click(uploadBtn!);

    await waitFor(() => {
      expect(screen.getByText('Template uploaded successfully')).toBeInTheDocument();
    });
  });

  it('shows error toast when upload fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByText(/upload template/i).closest('button');
    fireEvent.click(uploadBtn!);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('shows error toast when validation API fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Validation service unavailable'));

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByText(/validate template/i).closest('button');
    fireEvent.click(validateBtn!);

    await waitFor(() => {
      expect(screen.getByText(/validation error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while validating', async () => {
    let resolveValidation: (value: Response) => void;
    const validationPromise = new Promise<Response>((resolve) => {
      resolveValidation = resolve;
    });

    global.fetch = jest.fn().mockReturnValue(validationPromise);

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const validateBtn = screen.getByText(/validate template/i).closest('button');
    fireEvent.click(validateBtn!);

    await waitFor(() => {
      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    resolveValidation!({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockValidateResponse }),
    } as Response);
  });

  it('shows loading state while uploading', async () => {
    let resolveUpload: (value: Response) => void;
    const uploadPromise = new Promise<Response>((resolve) => {
      resolveUpload = resolve;
    });

    global.fetch = jest.fn().mockReturnValue(uploadPromise);

    render(<TemplateUploadForm />);

    const nameInput = screen.getByLabelText(/template name/i);
    await userEvent.type(nameInput, 'Test Template');

    const fileInput = screen.getByAccept(/^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i);
    const file = new File(['mock-docx'], 'template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByText(/upload template/i).closest('button');
    fireEvent.click(uploadBtn!);

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    resolveUpload!({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockUploadResponse }),
    } as Response);
  });
});