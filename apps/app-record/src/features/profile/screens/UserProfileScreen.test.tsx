// Jest globals are available without import
import { render, screen, waitFor } from '@testing-library/react-native';
import { UserProfileScreen } from './UserProfileScreen';
import { useAuth } from '@/features/auth';
import { useUserProfile } from '../hooks/useUserProfile';
import { profileService } from '../services/profileService';

// Mock dependencies
jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../hooks/useUserProfile', () => ({
  useUserProfile: jest.fn(),
}));

jest.mock('../services/profileService', () => ({
  profileService: {
    getDisplayName: jest.fn(),
  },
}));

describe('UserProfileScreen', () => {
  const mockOnViewProjects = jest.fn();
  const mockSignOut = jest.fn();

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'test@example.com',
    phone_number: '+1234567890',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_anonymous: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });
    (profileService.getDisplayName as jest.Mock).mockReturnValue('John Doe');
  });

  it('should render loading state', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      profile: null,
      loading: true,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.getByText('Loading profile...')).toBeTruthy();
  });

  it('should render error state', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      profile: null,
      loading: false,
      error: new Error('Failed to fetch profile'),
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.getByText('Error loading profile')).toBeTruthy();
    expect(screen.getByText('Failed to fetch profile')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
  });

  it('should render profile information when loaded', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByText('+1234567890')).toBeTruthy();
    expect(screen.getByText('Member Since')).toBeTruthy();
  });

  it('should call onViewProjects when View Projects button is pressed', () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    const viewProjectsButton = screen.getByRole('button', {
      name: 'View Projects',
    });
    viewProjectsButton.props.onPress();

    expect(mockOnViewProjects).toHaveBeenCalledTimes(1);
  });

  it('should call signOut when Sign Out button is pressed', async () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
    });

    mockSignOut.mockResolvedValue(undefined);

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    const signOutButton = screen.getByRole('button', { name: 'Sign Out' });
    signOutButton.props.onPress();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('should not render phone number when it is null', () => {
    const profileWithoutPhone = {
      ...mockProfile,
      phone_number: null,
    };

    (useUserProfile as jest.Mock).mockReturnValue({
      profile: profileWithoutPhone,
      loading: false,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.queryByText('Phone')).toBeNull();
  });

  it('should not render Member Since when created_at is null', () => {
    const profileWithoutCreatedAt = {
      ...mockProfile,
      created_at: null,
    };

    (useUserProfile as jest.Mock).mockReturnValue({
      profile: profileWithoutCreatedAt,
      loading: false,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.queryByText('Member Since')).toBeNull();
  });

  it('should use auth email as fallback when profile email is missing', () => {
    const profileWithoutEmail = {
      ...mockProfile,
      email: null,
    };

    (useUserProfile as jest.Mock).mockReturnValue({
      profile: profileWithoutEmail,
      loading: false,
      error: null,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('should display "Not available" when both profile and auth email are missing', () => {
    const profileWithoutEmail = {
      ...mockProfile,
      email: null,
    };

    (useUserProfile as jest.Mock).mockReturnValue({
      profile: profileWithoutEmail,
      loading: false,
      error: null,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-123', email: null },
      signOut: mockSignOut,
    });

    render(<UserProfileScreen onViewProjects={mockOnViewProjects} />);

    expect(screen.getByText('Not available')).toBeTruthy();
  });
});
