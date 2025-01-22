'use client';

import { GalleryVerticalEnd } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { configEnv } from '@/lib/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function VerifyForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {

  const [message, setMessage] = React.useState({
    error: '',
    success: '',
  });
  const searchParams = useSearchParams()
  const token = searchParams.get("token");
  const router = useRouter();

  const handleConfirm = () => {
    fetch(`${configEnv.URL}/api/v1/auth/verify`,{
      method: "POST",
      body: JSON.stringify({token}),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(res => res.json()).then((data) => {
      setMessage({
        success: data.status !== 'error' ? data.message : '',
        error: data.status === 'error' ? data.message : '',
      })
      if (data.status !== 'error') {
        router.push('/signin')
      }
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {message?.error ? (
        <p className='text-sm text-red-500'>{message.error}</p>
      ) : (
        <p className='text-sm text-green-500'>{message.success}</p>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <a
            href="#"
            className="flex flex-col items-center gap-2 font-medium"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-6" />
            </div>
            <span className="sr-only">Acme Inc.</span>
          </a>
          <h1 className="text-xl font-bold">Verify your account.</h1>
          <p className="text-muted-foreground text-sm">
            Click verify button to confirm your account creation
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={handleConfirm}>
          Verify your email
        </Button>
      </div>
      <div className="text-center text-sm">
        Already have an verified account?{" "}
        <Link href="/signin" className="underline underline-offset-4">
          Sign in
        </Link>
      </div>
      <div
        className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
