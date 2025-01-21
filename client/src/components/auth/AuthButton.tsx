"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

interface Props {
  type: "SignIn" | "SignUp";
}

const AuthButton = ({ type }: Props) => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "Loading..." : type === "SignIn" ? "Login" : "Register"}
    </Button>
  );
};
export default AuthButton;
