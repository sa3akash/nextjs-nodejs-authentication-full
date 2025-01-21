import React from 'react';
import { RegisterForm } from '@/components/auth/register-form';

import { Metadata } from 'next';
export const metadata: Metadata = {
  title: "Register",
  description: "Register a new account",
}

const SignUpPage = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm />
      </div>
    </div>
  );
};
export default SignUpPage;
