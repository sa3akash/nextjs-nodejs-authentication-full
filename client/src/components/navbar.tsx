import React from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { sigOutAction } from "@/lib/actions/signup";

const Navbar = async () => {
  const session = await getSession();

  // console.log({ session });

  return (
    <div className="flex items-center gap-4 max-w-prose mx-auto py-4">
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Home
      </Link>{" "}
      {session?.user ? (
        <>
          <Link href="/feed" className={buttonVariants({ variant: "outline" })}>
            Feed
          </Link>
          <Link
            href="/profile"
            className={buttonVariants({ variant: "outline" })}
          >
            Profile
          </Link>
          <Link
            href="/admin"
            className={buttonVariants({ variant: "outline" })}
          >
            Admin
          </Link>
          <Button variant="outline" onClick={sigOutAction}>
            Logout
          </Button>
        </>
      ) : (
        <>
          <Link
            href="/signin"
            className={buttonVariants({ variant: "outline" })}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ variant: "outline" })}
          >
            Register
          </Link>
        </>
      )}
    </div>
  );
};
export default Navbar;
