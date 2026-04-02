import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Users, Network, MapPin, Activity } from "lucide-react";
import { getDashboardStats } from "#/servers/dashboard-stats";

export const Route = createFileRoute("/admin/")({
  loader: () => getDashboardStats(),
  component: Dashboard
});

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { subscriberCount, locationCount, activeCount, userCount, appName } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{appName}</h1>
        <p className="text-muted-foreground">Welcome to the admin dashboard.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Subscribers"
          value={subscriberCount}
          description="All PPPoE subscribers"
          icon={Network}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Subscribers"
          value={activeCount}
          description="Currently enabled accounts"
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Locations"
          value={locationCount}
          description="OLT / BTS / POP sites"
          icon={MapPin}
          color="bg-orange-500"
        />
        <StatCard
          title="Admin Users"
          value={userCount}
          description="System users"
          icon={Users}
          color="bg-purple-500"
        />
      </div>
    </div>
  );
}
