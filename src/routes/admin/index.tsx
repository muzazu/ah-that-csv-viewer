import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Users, Network, MapPin, Activity } from "lucide-react";

const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const [{ db }, { subscribers, locations, appSettings }, { sql }] = await Promise.all([
    import("#/db"),
    import("#/db/schema"),
    import("drizzle-orm")
  ]);

  const [subscriberCount] = await db.select({ count: sql<number>`count(*)` }).from(subscribers);
  const [locationCount] = await db.select({ count: sql<number>`count(*)` }).from(locations);
  const [activeCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscribers)
    .where(sql`enabled = 1`);
  const settings = await db.select().from(appSettings).limit(1);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(sql`"user"` as any);

  return {
    subscriberCount: Number(subscriberCount?.count ?? 0),
    locationCount: Number(locationCount?.count ?? 0),
    activeCount: Number(activeCount?.count ?? 0),
    userCount: Number(userCount?.count ?? 0),
    appName: settings[0]?.appName ?? "My App"
  };
});

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
