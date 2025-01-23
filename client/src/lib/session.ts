import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Role = "admin" | "moderator" | "user";

export type SessionType = {
  user: {
    _id: string;
    name: string;
    email: string;
    role: Role;
    profilePicture: string;
    isVerified: string;
  };
  accessToken: string;
  refreshToken: string;
};

const secretKey = process.env.SESSION_SECRET_KEY!;
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(payload: SessionType) {
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);

  const cookiesList = await cookies();

  cookiesList.set("session", session, {
    httpOnly: true,
    secure: true,
    expires: expiredAt,
    sameSite: "strict",
    path: "/",
  });
}

export async function getSession() {
  const cookiesList = await cookies();
  const cookie = cookiesList.get("session")?.value;

  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie, encodedKey, {
      algorithms: ["HS256"],
    });

    return payload as SessionType;
  } catch (err) {
    console.error("Failed to verify the session", err);
    redirect("/signin");
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function updateTokens({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) {
  const cookiesList = await cookies();
  const cookie = cookiesList.get("session")?.value;

  if (!cookie) return null;

  const { payload } = await jwtVerify<SessionType>(cookie, encodedKey);

  if (!payload) return null;

  const newPayload: SessionType = {
    user: {
      ...payload.user,
    },
    accessToken,
    refreshToken,
  };

  await createSession(newPayload);
}
