import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  setupStep1Schema,
  setupStep2Schema,
  type SetupStep1Values,
  type SetupStep2Values
} from "#/lib/schemas";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Eye, EyeOff, Upload, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupWizard
});

type Step = 1 | 2;

function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step1Form = useForm<SetupStep1Values>({
    resolver: zodResolver(setupStep1Schema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" }
  });

  const step2Form = useForm<SetupStep2Values>({
    resolver: zodResolver(setupStep2Schema),
    defaultValues: { appName: "" }
  });

  const setupMutation = useMutation({
    mutationFn: async (
      payload: SetupStep1Values & SetupStep2Values & { logoFile: File | null }
    ) => {
      let logoPath: string | undefined;

      if (payload.logoFile) {
        const fd = new FormData();
        fd.append("file", payload.logoFile);
        const uploadRes = await fetch("/api/upload/logo", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const uploadData = (await uploadRes.json()) as { logoPath: string };
          logoPath = uploadData.logoPath;
        }
      }

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: payload.username,
          email: payload.email || undefined,
          password: payload.password,
          appName: payload.appName,
          logoPath
        })
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Setup failed. Please try again.");
      }
    },
    onSuccess: async () => {
      await router.navigate({ to: "/admin" });
    }
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File too large. Max 2 MB.");
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setLogoFile(file);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step > s
                    ? "bg-primary text-primary-foreground"
                    : step === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`h-0.5 w-12 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Admin Credentials */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create Admin Account</CardTitle>
              <CardDescription>
                Set up your administrator credentials to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={step1Form.handleSubmit(() => setStep(2))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="username"
                    placeholder="admin"
                    autoComplete="username"
                    {...step1Form.register("username")}
                  />
                  {step1Form.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {step1Form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    {...step1Form.register("email")}
                  />
                  {step1Form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {step1Form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      className="pr-10"
                      {...step1Form.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {step1Form.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {step1Form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className="pr-10"
                      {...step1Form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {step1Form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {step1Form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full mt-2">
                  Next: App Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: App Settings */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">App Settings</CardTitle>
              <CardDescription>Customize your application name and logo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={step2Form.handleSubmit((data) =>
                  setupMutation.mutate({ ...step1Form.getValues(), ...data, logoFile })
                )}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="appName">
                    App Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="appName"
                    placeholder="My ISP Manager"
                    {...step2Form.register("appName")}
                  />
                  {step2Form.formState.errors.appName && (
                    <p className="text-sm text-destructive">
                      {step2Form.formState.errors.appName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Logo <span className="text-muted-foreground text-xs">(optional, max 2 MB)</span>
                  </Label>
                  <div
                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload logo"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 w-auto object-contain rounded"
                      />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload PNG, JPEG, SVG, or WEBP
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  {logoError && <p className="text-sm text-destructive">{logoError}</p>}
                </div>

                {setupMutation.error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                    {setupMutation.error.message}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={setupMutation.isPending}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={setupMutation.isPending}>
                    {setupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                      </>
                    ) : (
                      "Finish Setup"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
