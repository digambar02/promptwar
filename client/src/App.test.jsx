import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock Firebase dependencies
vi.mock('./firebase', () => ({
  auth: {},
  googleProvider: {},
  db: {}
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback(null); // Simulate no user logged in
    return vi.fn();
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn()
}));

// Mock Lucide Icons to prevent rendering issues in tests
vi.mock('lucide-react', () => ({
  LogOut: () => <div data-testid="icon-logout" />,
  History: () => <div data-testid="icon-history" />,
  PlusCircle: () => <div data-testid="icon-plus" />,
  BookOpen: () => <div data-testid="icon-book" />,
  Briefcase: () => <div data-testid="icon-briefcase" />,
  GraduationCap: () => <div data-testid="icon-grad" />,
  Info: () => <div data-testid="icon-info" />,
}));

describe('App Component', () => {
  it('renders the login screen when user is not authenticated', () => {
    render(<App />);
    
    // Check for the Google Sign-in button
    expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument();
    
    // Check for the Landing Title
    expect(screen.getByText(/Learning Companion/i)).toBeInTheDocument();
  });
});
