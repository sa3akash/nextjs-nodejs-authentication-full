"use client";

import { GalleryVerticalEnd } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Social from "@/components/auth/Social";
import AuthButton from "@/components/auth/AuthButton";
import React from "react";
import { useFormState } from "react-dom";
import { signInAction } from '@/lib/actions/signup';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [state, loginAction, pending] = useFormState(signInAction, undefined);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {state?.message && (
        <p className={cn("text-sm text-red-500",
          {
            "text-green-400": state.success
          }
        )}>{state.message}</p>
      )}

      <form action={loginAction}>
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
            <h1 className="text-xl font-bold">Login to your account.</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email below to login to your account
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                name="email"
                disabled={pending}
              />
            </div>
            {state?.error?.email && (
              <p className="text-sm text-red-500">{state.error.email}</p>
            )}

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto text-sm underline-offset-2 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                required
                disabled={pending}
                name="password"
              />
            </div>
            {state?.error?.password && (
              <p className="text-sm text-red-500">{state.error.password}</p>
            )}


            <AuthButton type="SignIn" />
          </div>
          <Social type="SignIn" />
        </div>
      </form>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
