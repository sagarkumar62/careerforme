import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back to Career For Me"
      subtitle="Sign in to access your personalized career roadmap & AI mentor."
    >
      <LoginForm />
    </AuthLayout>
  );
}
