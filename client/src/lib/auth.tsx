import React from "react";
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  username: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Fazer a requisição diretamente sem usar apiRequest para poder lidar com 401
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        // Mostrar a mensagem de erro retornada pelo backend
        toast({
          title: "Erro de autenticação",
          description: data.message || "Credenciais inválidas. Use: valderlan / 01012025",
          variant: "destructive",
        });
        throw new Error(data.message || "Credenciais inválidas");
      }
    } catch (error) {
      // Se o erro não foi tratado acima, mostrar mensagem genérica
      if (!(error instanceof Error && error.message)) {
        toast({
          title: "Erro de autenticação",
          description: "Erro de conexão com o servidor",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado do sistema.",
    });
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}