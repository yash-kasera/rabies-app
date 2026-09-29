import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Login from '../pages/Login';

test('renders hospital login form', () => {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  expect(screen.getByText('Hospital Portal')).toBeInTheDocument();
});
