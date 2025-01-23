"use server";

import {
  deleteSession,
  getSession,
} from "@/lib/session";
import { api } from "@/lib/api";

export const generate2Fa = async () => {
  const session = await getSession();

  if(!session?.user) {
    return null
  }

  const data = await api("/security/generate", {
    method: "GET",
    headers: {
      authorization: session?.accessToken
        ? `Bearer ${session?.accessToken}`
        : "",
    },
  });

  console.log(data);


  if (data.isError) {
    return null;
  }

  return data;

};
