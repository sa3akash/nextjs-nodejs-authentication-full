"use server";

import { FormState, LoginFormSchema, SignupFormSchema } from "@/lib/types";
import { configEnv } from "@/lib/config";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { api } from "@/lib/api";
import { createSession, deleteSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export const signUpAction = async (
  state: FormState,
  formData: FormData,
): Promise<FormState> => {
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

  if (!data.isError) {
    return {
      message: data.message,
      success: true,
    };
  }
  return {
    message: data.message || "Something went wrong.",
  };
};

export const signInAction = async (
  state: FormState,
  formData: FormData,
): Promise<FormState> => {
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

  if (!data.isError) {
    await createSession(data);
    redirect("/feed");
  }
  return {
    message: data.message,
  };
};

export const sigOutAction = async () => {
  await deleteSession();

  revalidatePath("/");
  redirect("/signin");
};
