import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '../utils/test-utils'
import Sidebar from '@/components/dashboard/Sidebar'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/components/dashboard/ProfileContext'

jest.mock('next/navigation')
jest.mock('@/components/dashboard/ProfileContext', () => ({
  useProfile: jest.fn(),
  ProfileProvider: ({ children }: { children: ReactNode }) => children,
}))

describe('Sidebar Component', () => {
  const mockOnClose = jest.fn()
  const mockUsePathname = usePathname as jest.Mock
  const mockUseProfile = useProfile as jest.Mock
  const mockRefetch = jest.fn()

  const userProfile = {
    user: {
      user_id: 'u-1',
      username: 'johndoe',
      display_name: 'John Doe',
      role: 'user',
      is_locked: false,
    },
    settings: { language: 'en' },
    loading: false,
    error: null,
    refetch: mockRefetch,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.setItem('language', 'en')
    mockUsePathname.mockReturnValue('/dashboard')
    mockUseProfile.mockReturnValue(userProfile)
  })

  describe('Rendering', () => {
    it('should render sidebar with all navigation items', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('FocusFlow Pro')).toBeInTheDocument()
      expect(screen.getByText('Management system')).toBeInTheDocument()

      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('My calendar')).toBeInTheDocument()
      expect(screen.getByText('Reminders')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Share')).toBeInTheDocument()
      expect(screen.getByText('Statistics')).toBeInTheDocument()
      expect(screen.getByText('History')).toBeInTheDocument()
      expect(screen.getByText('Import & Export')).toBeInTheDocument()
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Help')).toBeInTheDocument()
    })

    it('should render "Create new" button', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const createButton = screen.getByRole('link', { name: /create new/i })
      expect(createButton).toBeInTheDocument()
      expect(createButton).toHaveAttribute('href', '/lich/tao-moi')
    })

    it('should render user profile section', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should show admin link only for admin users', () => {
      mockUseProfile.mockReturnValue({
        ...userProfile,
        user: {
          user_id: 'u-1',
          username: 'boss',
          display_name: 'Boss',
          role: 'admin',
          is_locked: false,
        },
      })

      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const adminLink = screen.getByRole('link', { name: /^admin$/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute('href', '/admin')
      expect(screen.getByText('Boss')).toBeInTheDocument()
    })

    it('should hide admin link for normal users', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const dashboardLink = screen.getByRole('link', { name: /overview/i })
      expect(dashboardLink).toHaveClass('bg-primary')
      expect(dashboardLink).toHaveClass('text-on-primary')
    })

    it('should highlight active item for nested routes', () => {
      mockUsePathname.mockReturnValue('/lich/tao-moi')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const calendarLink = screen.getByRole('link', { name: /my calendar/i })
      expect(calendarLink).toHaveClass('bg-primary')
    })

    it('should not highlight inactive items', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).not.toHaveClass('bg-primary')
      expect(settingsLink).toHaveClass('text-on-surface-variant')
    })
  })

  describe('Mobile Behavior', () => {
    it('should show overlay when open on mobile', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/40')
      expect(overlay).toBeInTheDocument()
    })

    it('should not show overlay when closed', () => {
      const { container } = render(<Sidebar isOpen={false} onClose={mockOnClose} />)

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/40')
      expect(overlay).not.toBeInTheDocument()
    })

    it('should call onClose when overlay is clicked', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/40')
      fireEvent.click(overlay!)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when close button is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]'),
      )

      fireEvent.click(closeButton!)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should apply correct transform classes based on isOpen', () => {
      const { container, rerender } = render(<Sidebar isOpen={false} onClose={mockOnClose} />)

      const sidebar = container.querySelector('aside')
      expect(sidebar).toHaveClass('-translate-x-full')

      rerender(<Sidebar isOpen={true} onClose={mockOnClose} />)
      expect(sidebar).toHaveClass('translate-x-0')
    })
  })

  describe('Navigation', () => {
    it('should have correct href for all navigation items', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const navItems = [
        { text: 'Overview', href: '/dashboard' },
        { text: 'My calendar', href: '/lich' },
        { text: 'Reminders', href: '/nhac-viec' },
        { text: 'Tags', href: '/the' },
        { text: 'Templates', href: '/mau-lich' },
        { text: 'Share', href: '/chia-se' },
        { text: 'Statistics', href: '/thong-ke' },
        { text: 'History', href: '/lich-su' },
        { text: 'Import & Export', href: '/nhap-xuat' },
        { text: 'Notifications', href: '/thong-bao' },
        { text: 'Settings', href: '/cai-dat' },
        { text: 'Help', href: '/tro-giup' },
      ]

      navItems.forEach(({ text, href }) => {
        const link = screen.getByRole('link', { name: new RegExp(text, 'i') })
        expect(link).toHaveAttribute('href', href)
      })
    })

    it('should call onClose when navigation item is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const dashboardLink = screen.getByRole('link', { name: /overview/i })
      fireEvent.click(dashboardLink)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when "Create new" button is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const createButton = screen.getByRole('link', { name: /create new/i })
      fireEvent.click(createButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when profile link is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const profileLink = screen.getByRole('link', { name: /john doe/i })
      fireEvent.click(profileLink)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Icons', () => {
    it('should render icons for all navigation items', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const icons = container.querySelectorAll('nav svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should render logo icon', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const logoIcon = container.querySelector('.bg-primary svg')
      expect(logoIcon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('should have accessible links', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)

      links.forEach((link) => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('should have accessible buttons', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Styling', () => {
    it('should have correct background color', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const sidebar = container.querySelector('aside')
      expect(sidebar).toHaveClass('bg-surface-container-highest')
    })

    it('should have correct width', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const sidebar = container.querySelector('aside')
      expect(sidebar).toHaveClass('w-sidebar-width')
    })

    it('should be fixed positioned', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const sidebar = container.querySelector('aside')
      expect(sidebar).toHaveClass('fixed')
      expect(sidebar).toHaveClass('left-0')
      expect(sidebar).toHaveClass('top-0')
    })
  })
})
