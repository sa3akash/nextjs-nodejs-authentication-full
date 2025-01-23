"use client";

import React, { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

const AuthButton = ({ children }: PropsWithChildren) => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "Loading..." : children}
    </Button>
  );
};
export default AuthButton;
