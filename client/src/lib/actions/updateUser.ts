"use server";

import {
  createSession,
  deleteSession,
  getSession,
  SessionType,
} from "@/lib/session";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export const updateUser = async () => {
  const session = await getSession();

  const data = await api("/auth/getUser", {
    method: "GET",
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
  });

  if (data.isError) {
    if (data.statusCode === 401) {
      redirect("/signin");
    }
    await deleteSession();
    return null;
  }

  const sessionData: SessionType = {
    accessToken: session?.accessToken as string,
    refreshToken: session?.refreshToken as string,
    user: {
      email: data.email,
      role: data.role,
      name: data.name,
      _id: data._id,
      isVerified: data.isVerified,
      profilePicture: data.profilePicture,
    },
  };

  await createSession(sessionData);

  return sessionData || session;
};
