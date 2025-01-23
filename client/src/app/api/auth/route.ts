import { createSession, Role, SessionType } from "@/lib/session";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userId = searchParams.get("userId");
  const name = searchParams.get("name");
  const email = searchParams.get("email");
  const role = searchParams.get("role");
  const isVerified = searchParams.get("isVerified");
  const profilePicture = searchParams.get("profilePicture");

  if (
    !accessToken ||
    !refreshToken ||
    !userId ||
    !name ||
    !role ||
    !email ||
    !isVerified || !profilePicture
  ){
    return redirect("/signin?error=oauth login failed");
    // return NextResponse.json({error: 'failed to login'},{status:403})
    // throw new Error("Google Ouath Failed!");
  }


  const sessionData: SessionType = {
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: {
      email: email,
      role: role as Role,
      name: name,
      _id: userId,
      isVerified: isVerified,
      profilePicture: profilePicture,
    },
  };

  await createSession(sessionData);

  redirect("/feed");
}
