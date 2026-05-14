import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ConnectionError,
  MezonSyncError,
  DataValidationError,
  DataLoadError,
  NetworkError,
} from '../../../app/web/src/components/dashboard/ErrorStates';

describe('ErrorStates Components', () => {
  describe('ConnectionError', () => {
    it('renders connection error message', () => {
      render(<ConnectionError />);
      
      expect(screen.getByText('Lỗi kết nối hệ thống')).toBeInTheDocument();
      expect(screen.getByText(/Không thể kết nối đến máy chủ/)).toBeInTheDocument();
    });

    it('renders retry button when onRetry is provided', () => {
      const mockRetry = jest.fn();
      render(<ConnectionError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<ConnectionError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ConnectionError />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders error icon', () => {
      render(<ConnectionError />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('text-error');
    });
  });

  describe('MezonSyncError', () => {
    it('renders mezon sync error message', () => {
      render(<MezonSyncError />);
      
      expect(screen.getByText('Lỗi đồng bộ Mezon')).toBeInTheDocument();
      expect(screen.getByText(/Không thể đồng bộ dữ liệu với Mezon Bot/)).toBeInTheDocument();
    });

    it('renders custom retry label', () => {
      const mockRetry = jest.fn();
      render(<MezonSyncError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Kết nối lại' });
      expect(retryButton).toBeInTheDocument();
    });

    it('renders Mezon icon with M letter', () => {
      render(<MezonSyncError />);
      
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('M')).toHaveClass('text-[#F2994A]');
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<MezonSyncError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Kết nối lại' });
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('DataValidationError', () => {
    it('renders data validation error message', () => {
      render(<DataValidationError />);
      
      expect(screen.getByText('Lỗi nhập dữ liệu')).toBeInTheDocument();
      expect(screen.getByText(/Dữ liệu không hợp lệ/)).toBeInTheDocument();
    });

    it('renders custom retry label', () => {
      const mockRetry = jest.fn();
      render(<DataValidationError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<DataValidationError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('DataLoadError', () => {
    it('renders data load error message', () => {
      render(<DataLoadError />);
      
      expect(screen.getByText('Lỗi tải dữ liệu')).toBeInTheDocument();
      expect(screen.getByText(/Không thể tải dữ liệu từ máy chủ/)).toBeInTheDocument();
    });

    it('renders default retry label', () => {
      const mockRetry = jest.fn();
      render(<DataLoadError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<DataLoadError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại' });
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('NetworkError', () => {
    it('renders network error message', () => {
      render(<NetworkError />);
      
      expect(screen.getByText('Mạng không ổn định')).toBeInTheDocument();
      expect(screen.getByText(/Kết nối mạng không ổn định/)).toBeInTheDocument();
    });

    it('renders custom retry label', () => {
      const mockRetry = jest.fn();
      render(<NetworkError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại kết nối' });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn();
      render(<NetworkError onRetry={mockRetry} />);
      
      const retryButton = screen.getByRole('button', { name: 'Thử lại kết nối' });
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('renders network icon with correct styling', () => {
      render(<NetworkError />);
      
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('text-[#F2994A]');
    });
  });

  describe('Common ErrorTemplate behavior', () => {
    it('applies consistent styling across all error components', () => {
      const { rerender } = render(<ConnectionError />);
      
      let container = screen.getByText('Lỗi kết nối hệ thống').closest('div');
      expect(container).toHaveClass('bg-white', 'rounded-2xl', 'p-8', 'shadow-sm', 'text-center');

      rerender(<MezonSyncError />);
      container = screen.getByText('Lỗi đồng bộ Mezon').closest('div');
      expect(container).toHaveClass('bg-white', 'rounded-2xl', 'p-8', 'shadow-sm', 'text-center');
    });

    it('renders title with correct styling', () => {
      render(<ConnectionError />);
      
      const title = screen.getByText('Lỗi kết nối hệ thống');
      expect(title).toHaveClass('text-lg', 'font-bold', 'text-on-surface');
    });

    it('renders message with correct styling', () => {
      render(<ConnectionError />);
      
      const message = screen.getByText(/Không thể kết nối đến máy chủ/);
      expect(message).toHaveClass('text-sm', 'text-on-surface-variant');
    });

    it('renders retry button with correct styling when provided', () => {
      const mockRetry = jest.fn();
      render(<ConnectionError onRetry={mockRetry} />);
      
      const button = screen.getByRole('button', { name: 'Thử lại' });
      expect(button).toHaveClass(
        'mt-5',
        'px-6',
        'py-2.5',
        'bg-primary',
        'text-white',
        'rounded-xl',
        'font-medium',
        'text-sm'
      );
    });

    it('handles multiple retry clicks correctly', () => {
      const mockRetry = jest.fn();
      render(<ConnectionError onRetry={mockRetry} />);
      
      const button = screen.getByRole('button', { name: 'Thử lại' });
      
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockRetry).toHaveBeenCalledTimes(3);
    });
  });
});
