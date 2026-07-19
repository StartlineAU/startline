import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
        <NavBar />
        {children}
      </AuthProvider>
  );
}
