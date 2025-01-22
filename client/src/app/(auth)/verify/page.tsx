import React from 'react';
import { Metadata } from 'next';
import { VerifyForm } from '@/components/auth/verify-form';

export const metadata: Metadata = {
  title: "Verify Email Address",
  description: "Verify your account",
}

const Verify = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <VerifyForm />
      </div>
    </div>
  );
};
export default Verify;
