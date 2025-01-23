"use server";

import {
  createSession,
  deleteSession,
  getSession,
  SessionType,
} from "@/lib/session";
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


  console.log({data});


  if (data.isError) {
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
