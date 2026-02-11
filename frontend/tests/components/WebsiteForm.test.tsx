import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import WebsiteForm from '../../src/components/WebsiteForm';
import * as api from '../../src/services/api';

// Mock the API module
vi.mock('../../src/services/api', () => ({
  websiteApi: {
    createWebsite: vi.fn(),
  },
}));

describe('WebsiteForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/website name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/html content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create website/i })).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockWebsite = {
      id: 1,
      userId: 'demo-user',
      websiteName: 'test-website',
      websiteTitle: 'Test Website',
      htmlContent: '<html><body><h1>Test</h1></body></html>',
      status: 'pending' as const,
      podIpAddress: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(api.websiteApi.createWebsite).mockResolvedValue(mockWebsite);

    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    // Fill in form
    await user.type(screen.getByLabelText(/website name/i), 'test-website');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(
      screen.getByLabelText(/html content/i),
      '<html><body><h1>Test</h1></body></html>'
    );

    // Submit form
    await user.click(screen.getByRole('button', { name: /create website/i }));

    // Wait for API call
    await waitFor(() => {
      expect(api.websiteApi.createWebsite).toHaveBeenCalledWith({
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body><h1>Test</h1></body></html>',
      });
    });

    // Check success message
    await waitFor(() => {
      expect(screen.getByText(/website created successfully/i)).toBeInTheDocument();
    });

    // Check callback is called after delay
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('displays error for invalid DNS name (uppercase)', async () => {
    const user = userEvent.setup();
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/website name/i), 'INVALID-NAME');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), '<html>Test</html>');
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/must be lowercase.*alphanumeric/i)
      ).toBeInTheDocument();
    });

    expect(api.websiteApi.createWebsite).not.toHaveBeenCalled();
  });

  it('displays error for invalid DNS name (starts with hyphen)', async () => {
    const user = userEvent.setup();
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/website name/i), '-invalid');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), '<html>Test</html>');
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/must be lowercase.*alphanumeric/i)
      ).toBeInTheDocument();
    });
  });

  it('displays error for HTML content over 100KB', async () => {
    const user = userEvent.setup();
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    const largeContent = 'x'.repeat(102401); // 100KB + 1 byte

    await user.type(screen.getByLabelText(/website name/i), 'test-website');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), largeContent);
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(screen.getByText(/html content must be 100kb or less/i)).toBeInTheDocument();
    });
  });

  it('displays error for missing required fields', async () => {
    const user = userEvent.setup();
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    // Submit without filling any fields
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(screen.getByText(/website name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/website title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/html content is required/i)).toBeInTheDocument();
    });

    expect(api.websiteApi.createWebsite).not.toHaveBeenCalled();
  });

  it('displays API error message on submission failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Website with name "test-website" already exists';
    
    vi.mocked(api.websiteApi.createWebsite).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/website name/i), 'test-website');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), '<html>Test</html>');
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    const mockWebsite = {
      id: 1,
      userId: 'demo-user',
      websiteName: 'test-website',
      websiteTitle: 'Test Website',
      htmlContent: '<html><body><h1>Test</h1></body></html>',
      status: 'pending' as const,
      podIpAddress: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(api.websiteApi.createWebsite).mockResolvedValue(mockWebsite);

    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    const nameInput = screen.getByLabelText(/website name/i) as HTMLInputElement;
    const titleInput = screen.getByLabelText(/website title/i) as HTMLInputElement;
    const contentInput = screen.getByLabelText(/html content/i) as HTMLTextAreaElement;

    await user.type(nameInput, 'test-website');
    await user.type(titleInput, 'Test Website');
    await user.type(contentInput, '<html>Test</html>');
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(nameInput.value).toBe('');
      expect(titleInput.value).toBe('');
      expect(contentInput.value).toBe('');
    });
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    
    // Mock slow API response
    vi.mocked(api.websiteApi.createWebsite).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/website name/i), 'test-website');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), '<html>Test</html>');

    const submitButton = screen.getByRole('button', { name: /create website/i });
    await user.click(submitButton);

    // Button should be disabled and show "Creating..."
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
  });

  it('accepts valid DNS names with hyphens', async () => {
    const user = userEvent.setup();
    const mockWebsite = {
      id: 1,
      userId: 'demo-user',
      websiteName: 'my-awesome-website-123',
      websiteTitle: 'Test Website',
      htmlContent: '<html>Test</html>',
      status: 'pending' as const,
      podIpAddress: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(api.websiteApi.createWebsite).mockResolvedValue(mockWebsite);

    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText(/website name/i), 'my-awesome-website-123');
    await user.type(screen.getByLabelText(/website title/i), 'Test Website');
    await user.type(screen.getByLabelText(/html content/i), '<html>Test</html>');
    await user.click(screen.getByRole('button', { name: /create website/i }));

    await waitFor(() => {
      expect(api.websiteApi.createWebsite).toHaveBeenCalledWith({
        websiteName: 'my-awesome-website-123',
        websiteTitle: 'Test Website',
        htmlContent: '<html>Test</html>',
      });
    });
  });

  it('displays helpful placeholder text', () => {
    render(<WebsiteForm onSuccess={mockOnSuccess} />);

    expect(screen.getByPlaceholderText('my-awesome-website')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My Awesome Website')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/<html><body><h1>Hello World!<\/h1><\/body><\/html>/)
    ).toBeInTheDocument();
  });
});
