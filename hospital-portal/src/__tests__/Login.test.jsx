import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../pages/Login';

test('renders login form', () => {
  render(<Login />);
  expect(screen.getByText('Hospital Login')).toBeInTheDocument();
});
