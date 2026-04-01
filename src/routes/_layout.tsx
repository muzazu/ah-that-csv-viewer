import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout")({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}
