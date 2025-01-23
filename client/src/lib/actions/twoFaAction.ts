"use server";

import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import { revalidateTag } from "next/cache";

export const verifyTwoFa = async (code: string) => {
  try {
    const session = await getSession();

    if (!session) {
      return {
        message: "Unauthorized",
        isError: true,
        status: "error",
        statusCode: 401,
      };
    }
    revalidateTag("currentUsers");

    return await api("/security/verify", {
      method: "POST",
      headers: {
        authorization: session?.accessToken
          ? `Bearer ${session?.accessToken}`
          : "",
      },
      body: JSON.stringify({ code }),
    });
  }catch(err){
    console.log(JSON.stringify(err,null,2));

  }
};

export const offTwoFaAction = async (code: string) => {
  try {
    const session = await getSession();

    if (!session) {
      return {
        message: "Unauthorized",
        isError: true,
        status: "error",
        statusCode: 401,
      };
    }
    revalidateTag('currentUsers')

    return await api("/security/off", {
      method: "POST",
      headers: {
        authorization: session?.accessToken
          ? `Bearer ${session?.accessToken}`
          : "",
      },
      body: JSON.stringify({ code }),
    });
  }catch(err){
    console.log(JSON.stringify(err,null,2));

  }
};
