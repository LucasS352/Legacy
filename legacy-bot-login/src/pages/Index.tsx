import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FolderKanban, Database, Settings, Loader2, LogOut, AlertCircle } from "lucide-react";
import loginIllustration from "@/assets/login-illustration.png";
import { useAuth } from "@/contexts/AuthContext";

const modules = [
  {
    title: "Processos",
    description: "Gerencie e automatize seus fluxos de trabalho",
    icon: FolderKanban,
    href: "/crm",
  },
  {
    title: "Banco de Dados",
    description: "Consulte e administre seus dados",
    icon: Database,
    href: "#",
  },
  {
    title: "Configurações",
    description: "Configure WhatsApp, bot e integrações",
    icon: Settings,
    href: "/setup",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModules, setShowModules] = useState(isAuthenticated);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      setShowLoadingScreen(true);
      setTimeout(() => {
        setShowLoadingScreen(false);
        setShowModules(true);
      }, 1500);
    } else {
      setError(result.error || "Erro ao fazer login");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowModules(false);
    setEmail("");
    setPassword("");
  };

  // Loading screen
  if (showLoadingScreen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-card gap-6 animate-fade-in">
        <Bot className="h-10 w-10 text-accent" />
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando módulos...</p>
      </div>
    );
  }

  // Module selection screen (after login)
  if (showModules || isAuthenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-card p-4">
        <div className="w-full max-w-4xl animate-fade-in">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Bot className="h-8 w-8 text-accent" />
              <span
                className="text-3xl font-bold text-card-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Legacy Bot
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, <span className="text-accent font-medium">{user?.name || "Usuário"}</span> — Selecione um módulo
            </p>
          </div>

          {/* Modules */}
          <div className="grid gap-6 sm:grid-cols-3">
            {modules.map((mod, i) => (
              <a
                key={mod.title}
                href={mod.href === "#" ? undefined : mod.href}
                onClick={(e) => {
                  if (mod.href === "#") return;
                  e.preventDefault();
                  navigate(mod.href);
                }}
                className={`group flex flex-col items-center gap-6 rounded-2xl border border-border bg-secondary/40 p-10 text-center transition-all duration-300 hover:border-accent/50 hover:bg-secondary/70 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-1 ${mod.href === "#" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10 transition-colors duration-300 group-hover:bg-accent/20">
                  <mod.icon className="h-8 w-8 text-accent transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    {mod.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/40 text-muted-foreground transition-all duration-200 hover:bg-accent/10 hover:text-accent"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // Login screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl">
        {/* Left Panel */}
        <div className="hidden w-1/2 flex-col items-center justify-center bg-primary p-12 lg:flex relative border border-foreground/10 rounded-l-3xl">
          <div className="absolute top-6 left-6 w-3 h-3 rounded-full border border-foreground/30" />
          <div className="absolute bottom-6 right-6 w-3 h-3 rounded-full border border-foreground/30" />

          <img
            src={loginIllustration}
            alt="Legacy Bot illustration"
            className="mb-8 w-72 h-72 object-contain"
          />

          <h2 className="mb-4 text-4xl font-bold text-primary-foreground">
            Bem-vindo!
          </h2>

          <p className="max-w-sm text-center text-sm leading-relaxed text-primary-foreground/70">
            Otimize suas operações com nossa plataforma abrangente,
            permitindo automatizar tarefas, gerenciar fluxos de trabalho
            com eficiência e mitigar riscos, tudo em uma solução simplificada.
          </p>
        </div>

        {/* Right Panel */}
        <div className="flex w-full flex-col items-center justify-center bg-card p-8 sm:p-12 lg:w-1/2 rounded-r-3xl lg:rounded-l-none rounded-3xl lg:rounded-3xl relative">
          <div className="absolute top-6 right-6 grid grid-cols-2 gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Logo */}
          <div className="mb-6 flex items-center gap-2">
            <Bot className="h-8 w-8 text-accent" />
            <span className="text-2xl font-bold text-card-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Legacy Bot
            </span>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-card-foreground">Entrar</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Bem-vindo de volta! Por favor, insira seus dados.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 w-full max-w-sm flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Index;
