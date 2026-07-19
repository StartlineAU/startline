import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
      <AuthProvider>
        <NavBar />
        {children}
        <Footer />
      </AuthProvider>
  );
}
