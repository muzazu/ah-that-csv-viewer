import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "#/lib/auth-client";
import { loginSchema, type LoginValues } from "#/lib/schemas";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_layout/")({
  beforeLoad: async () => {
    // session check to redirect authenticated users away from the login page
    const session = await authClient.getSession();

    if (session.data?.user) {
      throw redirect({ to: "/admin" });
    }
  },
  component: LoginPage
});

function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" }
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = form;

  async function onSubmit(data: LoginValues) {
    try {
      const result = await authClient.signIn.username({
        username: data.username,
        password: data.password
      });
      if (result.error) {
        setError("root", { message: result.error.message ?? "Invalid username or password." });
      } else {
        await router.navigate({ to: "/admin" });
      }
    } catch {
      setError("root", { message: "An unexpected error occurred. Please try again." });
    }
  }

  useEffect(() => {
    async function checkSetup() {
      // check if setup is completed, if not redirect to setup page
      try {
        const setupResponse = await fetch("/api/setup", { method: "GET" });
        if (setupResponse.ok) {
          const { setupCompleted } = await setupResponse.json();
          if (!setupCompleted) {
            // oxlint-disable-next-line typescript/no-floating-promises
            router.navigate({ to: "/setup" });
          }
        }
      } catch (error) {
        console.error("Error checking setup status:", error);
      }
    }

    // oxlint-disable-next-line typescript/no-floating-promises
    checkSetup();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  autoComplete="username"
                  disabled={isSubmitting}
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {errors.root && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  Invalid username or password. Please try again.
                </div>
              )}

              <Button type="submit" className="w-full mt-8" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
