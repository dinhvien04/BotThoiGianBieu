import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ToastProvider } from '@/components/dashboard/Toast'
import { LanguageProvider } from '@/components/dashboard/LanguageContext'
import { ProfileProvider } from '@/components/dashboard/ProfileContext'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// All providers wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ToastProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ToastProvider>
  )
}

const DashboardProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ToastProvider>
      <LanguageProvider>
        <ProfileProvider>
          {children}
        </ProfileProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

const renderWithDashboardProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: DashboardProviders, ...options })

export * from '@testing-library/react'
export { customRender as render, renderWithDashboardProviders }

// Custom matchers
export const expectToBeInDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument()
}

export const expectToHaveClass = (element: HTMLElement, className: string) => {
  expect(element).toHaveClass(className)
}

// Mock data generators
export const mockSchedule = (overrides = {}) => ({
  id: 1,
  title: 'Test Schedule',
  description: 'Test description',
  start_time: new Date('2026-04-28T14:00:00'),
  end_time: new Date('2026-04-28T15:00:00'),
  status: 'pending',
  priority: 'normal',
  ...overrides,
})

export const mockUser = (overrides = {}) => ({
  id: 'user-123',
  username: 'testuser',
  display_name: 'Test User',
  ...overrides,
})

export const mockTag = (overrides = {}) => ({
  id: 1,
  name: 'work',
  color: '#FF6B6B',
  ...overrides,
})
