import React from 'react';

export default function AuthLayout({ children }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="">
    {children}
    </main>
  );
}