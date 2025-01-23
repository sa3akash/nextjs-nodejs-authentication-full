"use server";

import { FormState, LoginFormSchema, SignupFormSchema } from "@/lib/types";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { createSession, deleteSession } from "@/lib/session";

export const signUpAction = async (
  state: FormState,
  formData: FormData,
): Promise<FormState> => {
  try {
    const validationFields = SignupFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validationFields.success) {
      return {
        error: validationFields.error.flatten().fieldErrors,
      };
    }

    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify(validationFields.data),
    });

    if (data.status !== "error") {
      return {
        message: data.message,
        success: true,
      };
    }
    return {
      message: data.message || "Something went wrong.",
    };
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
};

export const signInAction = async (
  state: FormState,
  formData: FormData,
): Promise<FormState> => {
  try {
    const validatedFields = LoginFormSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!validatedFields.success) {
      return {
        error: validatedFields.error.flatten().fieldErrors,
      };
    }

    const data = await api("/auth/signin", {
      method: "POST",
      body: JSON.stringify(validatedFields.data),
    });

    if (data.status !== "error") {
      await createSession(data);
      redirect("/feed");
    }
    return {
      message: data.message,
    };
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
};

export const sigOutAction = async () => {
  try {
    await deleteSession();

    redirect("/signin");
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
};
