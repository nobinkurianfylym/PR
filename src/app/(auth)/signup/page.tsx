"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/hooks/use-overview";
import { safeNext } from "@/lib/safe-next";

const schema = z.object({
  name: z.string().min(2, "Tell us your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type Values = z.infer<typeof schema>;

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  // A joiner arrives with ?next=/join/…; a lone signup lands on the wizard.
  const next = safeNext(params.get("next"), "/films/new");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const joining = next.startsWith("/join/");
  const signInLink = next === "/films/new" ? "/signin" : `/signin?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {joining ? "Join the campaign" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {joining
          ? "Create your account to get access to the press kit and assets."
          : "Your first campaign is five minutes away."}
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={handleSubmit(async (v) => {
          setServerError(null);
          const res = await api.signUp(v.name, v.email, v.password);
          if (res.ok) router.replace(next);
          else setServerError(((await res.json()) as { error?: string }).error ?? "Could not create account");
        })}
      >
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
        </Field>
        {serverError && <p className="text-sm text-red-400">{serverError}</p>}
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already on PR.FYLYM?{" "}
        <Link href={signInLink} className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
