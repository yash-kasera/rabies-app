import { render, screen } from '@testing-library/react';
import Login from '../pages/Login';

test('renders government login form', () => {
  render(<Login />);
  expect(screen.getByText('Government Login')).toBeInTheDocument();
});
