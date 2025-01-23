"use server";

import { getSession } from "@/lib/session";
import { api } from "@/lib/api";
import { redirect } from "next/navigation";

export const generate2Fa = async () => {
  try {
    const session = await getSession();

    if (!session?.user) {
      return null;
    }

    const data = await api("/security/generate", {
      method: "GET",
      headers: {
        authorization: session?.accessToken
          ? `Bearer ${session?.accessToken}`
          : "",
      },
    });

    if (data.status === "error") {
      return null;
    }

    return data;
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
};

export const twoFaLogin = async (data: { code: string; email: string }) => {
  try {
    if (!data.code || !data.email) {
      return {
        status: "error",
        message: "All fields are required",
      };
    }

    const response = await api("/security/twoFaLogin", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.status !== "error") {
      // await createSession(response);
      redirect("/feed");
    }
    return response;
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
};
