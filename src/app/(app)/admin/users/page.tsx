import { UsersView } from "@/features/users/UsersView";

export const metadata = {
  title: "Users Administration · MAMS Hospital OHTMS",
  description: "User account management, access roles, and authentication credentials.",
};

export default function UsersAdminPage() {
  return <UsersView />;
}
