import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from './LoginScreen';
import { useAuth } from '../hooks/useAuth';

// Mock useAuth hook
jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockSignIn = jest.fn();
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      loading: false,
      user: null,
      session: null,
    });
  });

  it('should render login form', () => {
    const { getAllByText, getByText, getByPlaceholderText, getByRole } = render(
      <LoginScreen />
    );

    expect(getAllByText('Sign In').length).toBeGreaterThan(0); // Title and/or button
    expect(getByText('Enter your credentials to continue')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByRole('button')).toBeTruthy(); // Button
  });

  it('should show error when email is empty', async () => {
    const { getByText, getByRole } = render(<LoginScreen />);

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should show error when password is empty', async () => {
    const { getByText, getByPlaceholderText, getByRole } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should show error for invalid email format', async () => {
    const { getByText, getByPlaceholderText, getByRole } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should call signIn with valid credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('should trim email and password before submitting', async () => {
    mockSignIn.mockResolvedValue(undefined);

    const { getByPlaceholderText, getByRole } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.changeText(passwordInput, '  password123  ');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('should show loading state during sign in', async () => {
    mockSignIn.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByPlaceholderText, getByRole, queryByText } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(queryByText('Sign In')).toBeNull(); // Button text should be replaced by ActivityIndicator
    });
  });

  it('should clear error when user types', async () => {
    const { getByText, getByPlaceholderText, getByRole, queryByText } = render(
      <LoginScreen />
    );

    // Trigger error first
    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Email is required')).toBeTruthy();
    });

    // Type in email field
    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');

    // Error should be cleared
    await waitFor(() => {
      expect(queryByText('Email is required')).toBeNull();
    });
  });

  it('should handle sign in error', async () => {
    const mockError = new Error('Invalid credentials');
    mockSignIn.mockRejectedValue(mockError);

    const { getByText, getByPlaceholderText, getByRole } = render(
      <LoginScreen />
    );

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');

    const signInButton = getByRole('button');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('should disable inputs during loading', () => {
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      loading: true,
      user: null,
      session: null,
    });

    const { getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');

    expect(emailInput.props.editable).toBe(false);
    expect(passwordInput.props.editable).toBe(false);
  });
});
