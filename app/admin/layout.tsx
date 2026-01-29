export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication is handled by middleware
  // This layout just wraps the admin pages
  return <>{children}</>;
}
