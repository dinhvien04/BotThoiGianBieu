import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import Sidebar from '@/components/dashboard/Sidebar'
import { usePathname } from 'next/navigation'
import { getUserProfile } from '@/lib/api'

jest.mock('next/navigation')
jest.mock('@/lib/api', () => ({
  getUserProfile: jest.fn(),
}))

describe('Sidebar Component', () => {
  const mockOnClose = jest.fn()
  const mockUsePathname = usePathname as jest.Mock

  const mockedGetUserProfile = getUserProfile as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
    mockedGetUserProfile.mockResolvedValue({
      success: true,
      user: {
        user_id: 'u-1',
        username: 'johndoe',
        display_name: 'John Doe',
        role: 'user',
        is_locked: false,
      },
      settings: {},
    })
  })

  describe('Rendering', () => {
    it('should render sidebar with all navigation items', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      // Check logo and title
      expect(screen.getByText('FocusFlow Pro')).toBeInTheDocument()
      expect(screen.getByText('Hệ thống quản lý')).toBeInTheDocument()

      // Check all nav items
      expect(screen.getByText('Tổng quan')).toBeInTheDocument()
      expect(screen.getByText('Lịch của tôi')).toBeInTheDocument()
      expect(screen.getByText('Nhắc việc')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Templates')).toBeInTheDocument()
      expect(screen.getByText('Chia sẻ')).toBeInTheDocument()
      expect(screen.getByText('Thống kê')).toBeInTheDocument()
      expect(screen.getByText('Lịch sử')).toBeInTheDocument()
      expect(screen.getByText('Nhập & Xuất')).toBeInTheDocument()
      expect(screen.getByText('Thông báo')).toBeInTheDocument()
      expect(screen.getByText('Cài đặt')).toBeInTheDocument()
      expect(screen.getByText('Trợ giúp')).toBeInTheDocument()
    })

    it('should render "Tạo mới" button', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const createButton = screen.getByRole('link', { name: /tạo mới/i })
      expect(createButton).toBeInTheDocument()
      expect(createButton).toHaveAttribute('href', '/lich/tao-moi')
    })

    it('should render user profile section', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('JD')).toBeInTheDocument() // Avatar initials
    })

    it('should show admin link only for admin users', async () => {
      mockedGetUserProfile.mockResolvedValue({
        success: true,
        user: {
          user_id: 'u-1',
          username: 'boss',
          display_name: 'Boss',
          role: 'admin',
          is_locked: false,
        },
        settings: {},
      })
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      await waitFor(() => {
        expect(screen.getByText('Quản trị')).toBeInTheDocument()
      })
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('should hide admin link for normal users', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      expect(screen.queryByText('Quản trị')).not.toBeInTheDocument()
    })
  })

  describe('Active State', () => {
    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const dashboardLink = screen.getByRole('link', { name: /tổng quan/i })
      expect(dashboardLink).toHaveClass('bg-primary')
      expect(dashboardLink).toHaveClass('text-white')
    })

    it('should highlight active item for nested routes', () => {
      mockUsePathname.mockReturnValue('/lich/tao-moi')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const lichLink = screen.getByRole('link', { name: /lịch của tôi/i })
      expect(lichLink).toHaveClass('bg-primary')
    })

    it('should not highlight inactive items', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const settingsLink = screen.getByRole('link', { name: /cài đặt/i })
      expect(settingsLink).not.toHaveClass('bg-primary')
      expect(settingsLink).toHaveClass('text-gray-300')
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
      
      // Find close button (X icon button)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => 
        btn.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]')
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
        { text: 'Tổng quan', href: '/dashboard' },
        { text: 'Lịch của tôi', href: '/lich' },
        { text: 'Nhắc việc', href: '/nhac-viec' },
        { text: 'Tags', href: '/the' },
        { text: 'Templates', href: '/mau-lich' },
        { text: 'Chia sẻ', href: '/chia-se' },
        { text: 'Thống kê', href: '/thong-ke' },
        { text: 'Lịch sử', href: '/lich-su' },
        { text: 'Nhập & Xuất', href: '/nhap-xuat' },
        { text: 'Thông báo', href: '/thong-bao' },
        { text: 'Cài đặt', href: '/cai-dat' },
        { text: 'Trợ giúp', href: '/tro-giup' },
      ]

      navItems.forEach(({ text, href }) => {
        const link = screen.getByRole('link', { name: new RegExp(text, 'i') })
        expect(link).toHaveAttribute('href', href)
      })
    })

    it('should call onClose when navigation item is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const dashboardLink = screen.getByRole('link', { name: /tổng quan/i })
      fireEvent.click(dashboardLink)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when "Tạo mới" button is clicked', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const createButton = screen.getByRole('link', { name: /tạo mới/i })
      fireEvent.click(createButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when profile link is clicked', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)

      const profileLink = await screen.findByRole('link', { name: /john doe/i })
      fireEvent.click(profileLink)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Icons', () => {
    it('should render icons for all navigation items', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      // Check that SVG icons are rendered
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
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    })

    it('should have accessible buttons', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe('Styling', () => {
    it('should have correct background color', () => {
      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />)
      
      const sidebar = container.querySelector('aside')
      expect(sidebar).toHaveClass('bg-[#1C1B1F]')
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
