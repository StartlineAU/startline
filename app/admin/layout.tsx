import NavBar from "@/components/NavBar";
import AmplifyProvider from "@/app/organiser/AmplifyProvider";
import { AuthProvider } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmplifyProvider>
      <AuthProvider>
        <NavBar />
        {children}
      </AuthProvider>
    </AmplifyProvider>
  );
}
