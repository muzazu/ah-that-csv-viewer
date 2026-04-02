import { HeadContent, Link, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TooltipProvider } from "../components/ui/tooltip";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";
import {
  DEFAULT_APP_NAME,
  DEFAULT_FAVICON_PATH,
  getStoredAppSettings
} from "#/servers/app-settings";

import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "#/components/ui/sonner";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => getStoredAppSettings(),
  head: ({ loaderData }) => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: loaderData?.appName ?? DEFAULT_APP_NAME
      }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      },
      {
        rel: "icon",
        href: loaderData?.logoPath ?? DEFAULT_FAVICON_PATH
      }
    ]
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">404 - Not Found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="text-sm font-extrabold bg-linear-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent underline"
      >
        Go back home
      </Link>
    </div>
  )
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
        <TooltipProvider>{children}</TooltipProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right"
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />
            },
            TanStackQueryDevtools
          ]}
        />
        <Scripts />

        <Toaster />
      </body>
    </html>
  );
}
