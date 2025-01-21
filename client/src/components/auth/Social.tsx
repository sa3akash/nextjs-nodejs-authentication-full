import React from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/utils/icons";
import Link from "next/link";

interface Props {
  type: "SignIn" | "SignUp";
}

const Social = ({ type }: Props) => {
  return (
    <>

      <div
        className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or
            </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Button variant="outline" className="w-full">
          <Icons.google />
          Login with Google
        </Button>
        <Button variant="outline" className="w-full">
          <Icons.gitHub />
          Login with Github
        </Button>
      </div>

      {type === "SignIn" ? (
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline underline-offset-4">
            Sign up
          </Link>
        </div>
      ) : (
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/signin" className="underline underline-offset-4">
            Sign in
          </Link>
        </div>
      )}
    </>
  );
};
export default Social;
