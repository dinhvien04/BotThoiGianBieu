import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../../../app/web/src/components/dashboard/Toast';

// Mock component để test useToast hook
function TestComponent() {
  const { showToast } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <button onClick={() => showToast('Warning message', 'warning')}>
        Show Warning
      </button>
      <button onClick={() => showToast('Default message')}>
        Show Default
      </button>
    </div>
  );
}

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders ToastProvider without crashing', () => {
    render(
      <ToastProvider>
        <div>Test content</div>
      </ToastProvider>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows success toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    const toastElement = screen.getByText('Success message').closest('div');
    expect(toastElement).toHaveClass('bg-[#27AE60]');
  });

  it('shows error toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
    const toastElement = screen.getByText('Error message').closest('div');
    expect(toastElement).toHaveClass('bg-error');
  });

  it('shows info toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    
    expect(screen.getByText('Info message')).toBeInTheDocument();
    const toastElement = screen.getByText('Info message').closest('div');
    expect(toastElement).toHaveClass('bg-primary');
  });

  it('shows warning toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    const toastElement = screen.getByText('Warning message').closest('div');
    expect(toastElement).toHaveClass('bg-[#F2994A]');
  });

  it('defaults to info type when no type specified', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Default'));
    
    expect(screen.getByText('Default message')).toBeInTheDocument();
    const toastElement = screen.getByText('Default message').closest('div');
    expect(toastElement).toHaveClass('bg-primary');
  });

  it('removes toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '' }); // Close button has no text
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('automatically removes toast after 4 seconds', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Fast-forward time by 4 seconds
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('shows multiple toasts simultaneously', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('removes specific toast without affecting others', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Click close button on success toast (first close button)
    const closeButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(closeButtons[0]);
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders correct icons for each toast type', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('handles rapid toast creation', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Rapidly create multiple toasts
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Show Success'));
    }
    
    const toasts = screen.getAllByText('Success message');
    expect(toasts).toHaveLength(5);
  });

  it('maintains toast order (newest at bottom)', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    const toastContainer = screen.getByText('Success message').closest('.space-y-2');
    const toasts = toastContainer?.children;
    
    expect(toasts?.[0]).toHaveTextContent('Success message');
    expect(toasts?.[1]).toHaveTextContent('Error message');
  });
});
