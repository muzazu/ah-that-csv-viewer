import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TooltipProvider } from "../components/ui/tooltip";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";
import { DEFAULT_APP_NAME, DEFAULT_FAVICON_PATH, getStoredAppSettings } from "#/lib/app-settings";

import type { QueryClient } from "@tanstack/react-query";

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
  shellComponent: RootDocument
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
      </body>
    </html>
  );
}
