import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  editRoleSchema,
  type CreateUserValues,
  type EditRoleValues
} from "#/lib/schemas";
import { authClient } from "#/lib/auth-client";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "#/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "#/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "#/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "#/components/ui/select";
import { MoreHorizontal, Plus, Loader2, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage
});

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: string | Date;
};

async function fetchUsers(): Promise<BetterAuthUser[]> {
  const res = await authClient.admin.listUsers({ query: { limit: 200 } });
  return (res.data?.users ?? []) as BetterAuthUser[];
}

function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<BetterAuthUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<BetterAuthUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserValues) => {
      const result = await authClient.admin.createUser({
        name: data.username,
        email: data.email,
        password: data.password,
        role: data.role as "admin" | "user"
      });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const result = await authClient.admin.setRole({ userId, role: role as "admin" | "user" });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUser(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.removeUser({ userId });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteUser(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and roles.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role ?? "user"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(u)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
        error={createMutation.error?.message ?? null}
      />

      {/* Edit Role Dialog */}
      {editUser && (
        <EditRoleDialog
          user={editUser}
          open={true}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSubmit={(role) => updateRoleMutation.mutate({ userId: editUser.id, role })}
          isPending={updateRoleMutation.isPending}
          error={updateRoleMutation.error?.message ?? null}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={true}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          onConfirm={() => deleteMutation.mutate(deleteUser.id)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: CreateUserValues) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors }
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", email: "", password: "", role: "user" }
  });

  useEffect(() => {
    if (open) reset({ username: "", email: "", password: "", role: "user" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>Create a new system user account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-username">Username</Label>
            <Input id="new-username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error
}: {
  user: BetterAuthUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (role: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  const { handleSubmit, control } = useForm<EditRoleValues>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: { role: (user.role as "user" | "admin") ?? "user" }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Change role for <strong>{user.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => onSubmit(data.role))} className="space-y-4 py-2">
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full mb-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending
}: {
  user: BetterAuthUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
