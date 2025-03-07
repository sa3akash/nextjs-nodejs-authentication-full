"use client";

import { GalleryVerticalEnd } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Social from "@/components/auth/Social";
import AuthButton from "@/components/auth/AuthButton";
import { useFormState } from "react-dom";
import { signUpAction } from "@/lib/actions/signup";
import React from 'react';

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [state, registerAction, pending] = useFormState(signUpAction, undefined);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>

      {state?.message && (
        <p className={cn("text-sm text-red-500",
          {
            "text-green-400": state.success
          }
        )}>{state.message}</p>
      )}

      <form action={registerAction}>
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
            <h1 className="text-xl font-bold">Create an account .</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email below to create your account
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Email</Label>
              <Input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your name"
                required
                disabled={pending}
              />
            </div>

            {state?.error?.name && (
              <p className="text-sm text-red-500">{state.error.name}</p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="m@example.com"
                required
                disabled={pending}
              />
            </div>
            {state?.error?.email && (
              <p className="text-sm text-red-500">{state.error.email}</p>
            )}

            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>


              <Input
                id="password"
                type="password"
                name="password"
                required
                disabled={pending}
              />
            </div>
            {state?.error?.password && (
              <div className="text-sm text-red-500">
                <p>Password must:</p>
                <ul>
                  {state.error.password.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <AuthButton>Register</AuthButton>
          </div>
          <Social type="SignUp" />
        </div>
      </form>
      <div className="text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
