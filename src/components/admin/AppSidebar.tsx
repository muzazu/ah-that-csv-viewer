import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "#/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "#/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  Network,
  MapPin,
  LogOut,
  ChevronsUpDown,
  Settings
} from "lucide-react";
import { authClient } from "#/lib/auth-client";
import { useRouter } from "@tanstack/react-router";

const NAV_ITEMS = [
  { title: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { title: "PPPoE", to: "/admin/pppoe", icon: Network, exact: false },
  { title: "Locations", to: "/admin/locations", icon: MapPin, exact: false },
  { title: "Users", to: "/admin/users", icon: Users, exact: false }
] as const;

interface AppSidebarProps {
  appName: string;
  logoPath?: string | null;
}

export function AppSidebar({ appName, logoPath }: AppSidebarProps) {
  const router = useRouter();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "AD";

  async function handleSignOut() {
    await authClient.signOut();
    await router.navigate({ to: "/" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden shrink-0">
                  {logoPath ? (
                    <img src={logoPath} alt={appName} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-sm font-bold">{appName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 leading-none min-w-0">
                  <span className="font-semibold truncate">{appName}</span>
                  <span className="text-xs text-muted-foreground">Admin Panel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to) && pathname !== "/admin";
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                    <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold">{user?.name ?? "Admin"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link to="/admin/users" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => void handleSignOut()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
