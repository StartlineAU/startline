import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import AmplifyProvider from "@/components/AmplifyProvider";
import { AuthProvider } from "@/context/AuthContext";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmplifyProvider>
      <AuthProvider>
        <NavBar />
        {children}
        <Footer />
      </AuthProvider>
    </AmplifyProvider>
  );
}
