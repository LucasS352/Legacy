import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bot,
    Wifi,
    WifiOff,
    QrCode,
    Send,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft,
    MessageSquare,
    Zap,
    AlertCircle,
    Phone,
    Terminal,
    Info,
    LogOut,
} from "lucide-react";
import { whatsappApi } from "@/services/api";

// ─── Types ────────────────────────────────────────────────────
type ConnStatus = "connected" | "disconnected" | "connecting" | "offline" | "unknown";

interface StatusInfo {
    status: ConnStatus;
    phone?: string;
    instance?: string;
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: ConnStatus }) {
    const map: Record<ConnStatus, { icon: React.ReactNode; label: string; cls: string }> = {
        connected: { icon: <CheckCircle2 className="h-4 w-4" />, label: "Conectado", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
        disconnected: { icon: <XCircle className="h-4 w-4" />, label: "Desconectado", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
        connecting: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "Conectando…", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
        offline: { icon: <WifiOff className="h-4 w-4" />, label: "Evolution API offline", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
        unknown: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "Verificando…", cls: "bg-muted text-muted-foreground border-border" },
    };
    const { icon, label, cls } = map[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
            {icon} {label}
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────
const Setup = () => {
    const navigate = useNavigate();
    const [statusInfo, setStatusInfo] = useState<StatusInfo>({ status: "unknown" });
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [loadingConnect, setLoadingConnect] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [testPhone, setTestPhone] = useState("");
    const [testMsg, setTestMsg] = useState("Olá! Este é um teste de conexão do Legacy Bot 🤖");
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [loadingTest, setLoadingTest] = useState(false);
    const [connectError, setConnectError] = useState("");
    const [loadingDisconnect, setLoadingDisconnect] = useState(false);
    const [qrPollActive, setQrPollActive] = useState(false);
    const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch connection status ───────────────────────────────
    const fetchStatus = useCallback(async () => {
        try {
            const res = await whatsappApi.getStatus();
            const d = res.data.data as { state?: string; phone?: string; instance?: string };
            const state = (d.state || "").toLowerCase();
            const mapped: ConnStatus =
                state === "open" || state === "connected" ? "connected"
                    : state === "connecting" || state === "qr" ? "connecting"
                        : state === "close" || state === "disconnected" ? "disconnected"
                            : "disconnected";
            setStatusInfo({ status: mapped, phone: d.phone, instance: d.instance });
            if (mapped === "connected") {
                setQrBase64(null);
                setQrPollActive(false);
            }
            return mapped;
        } catch {
            // Cannot reach Evolution API at all
            setStatusInfo({ status: "offline" });
            setQrPollActive(false);
            return "offline" as ConnStatus;
        } finally {
            setLoadingStatus(false);
        }
    }, []);

    // ── Auto-poll status every 6s ─────────────────────────────
    useEffect(() => {
        fetchStatus();
        statusPollRef.current = setInterval(fetchStatus, 6000);
        return () => { if (statusPollRef.current) clearInterval(statusPollRef.current); };
    }, [fetchStatus]);

    // ── Poll QR code every 8s while connecting ────────────────
    useEffect(() => {
        if (!qrPollActive) {
            if (qrPollRef.current) clearInterval(qrPollRef.current);
            return;
        }
        const pollQR = async () => {
            try {
                const res = await whatsappApi.getQR();
                const d = res.data as { data?: { qrcode?: string; base64?: string } };
                const qr = d.data?.base64 || d.data?.qrcode;
                if (qr) setQrBase64(qr);
            } catch { /* silent */ }
        };
        pollQR();
        qrPollRef.current = setInterval(pollQR, 8000);
        return () => { if (qrPollRef.current) clearInterval(qrPollRef.current); };
    }, [qrPollActive]);

    // ── Connect / start QR ───────────────────────────────────
    const handleConnect = async () => {
        setLoadingConnect(true);
        setConnectError("");
        setQrBase64(null);
        try {
            const res = await whatsappApi.connect();
            const d = res.data as {
                data?: {
                    qrcode?: { base64?: string } | string;
                    base64?: string;
                    instance?: { state?: string };
                };
            };

            // Try to extract QR from response
            let qr: string | null = null;
            if (typeof d.data?.qrcode === "object" && d.data.qrcode?.base64) {
                qr = d.data.qrcode.base64;
            } else if (typeof d.data?.qrcode === "string") {
                qr = d.data.qrcode;
            } else if (d.data?.base64) {
                qr = d.data.base64;
            }

            if (qr) {
                setQrBase64(qr);
            }

            // Check if already connected
            const state = d.data?.instance?.state || "";
            if (state.toLowerCase() === "open") {
                setStatusInfo((prev) => ({ ...prev, status: "connected" }));
            } else {
                setStatusInfo((prev) => ({ ...prev, status: "connecting" }));
                setQrPollActive(true); // start polling for QR
            }
        } catch (e: unknown) {
            const errData = (e as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
            const isNetworkError = (e as { code?: string })?.code === "ECONNREFUSED" || (e as { code?: string })?.code === "ECONNABORTED";

            if (isNetworkError || !errData) {
                setConnectError("Evolution API não está acessível em http://localhost:8081. Inicie-a com o comando abaixo.");
                setStatusInfo({ status: "offline" });
            } else {
                setConnectError(errData.error || errData.details || "Erro ao conectar com a Evolution API");
            }
        } finally {
            setLoadingConnect(false);
        }
    };

    // ── Send test message ────────────────────────────────────
    const handleTest = async () => {
        if (!testPhone.trim()) return;
        setLoadingTest(true);
        setTestResult(null);
        try {
            await whatsappApi.sendTest(testPhone.trim().replace(/\D/g, ""), testMsg);
            setTestResult({ success: true, message: "✅ Mensagem enviada com sucesso! Verifique o WhatsApp." });
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setTestResult({ success: false, message: msg || "Erro ao enviar. Verifique a conexão com o WhatsApp." });
        } finally {
            setLoadingTest(false);
        }
    };

    // ── Disconnect / Logout ───────────────────────────
    const handleDisconnect = async () => {
        if (!window.confirm("Tem certeza que deseja desconectar o WhatsApp? A sessão será encerrada e precisará escanear o QR Code novamente.")) return;
        setLoadingDisconnect(true);
        try {
            await whatsappApi.disconnect();
            setStatusInfo({ status: "disconnected" });
            setQrBase64(null);
            setQrPollActive(false);
        } catch {
            // silent — status poll will update shortly
        } finally {
            setLoadingDisconnect(false);
        }
    };

    const isConnected = statusInfo.status === "connected";
    const isOffline = statusInfo.status === "offline";

    return (
        <div className="min-h-screen bg-card text-card-foreground">
            {/* Top bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 backdrop-blur px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:text-card-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Bot className="h-5 w-5 text-accent" />
                    <span className="text-base font-semibold">Configurações — WhatsApp</span>
                </div>
                <StatusBadge status={statusInfo.status} />
            </div>

            <div className="mx-auto max-w-3xl space-y-6 p-6">

                {/* ── Evolution API Offline Banner ── */}
                {isOffline && (
                    <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-orange-400 font-semibold">
                            <AlertCircle className="h-5 w-5" /> Evolution API não detectada
                        </div>
                        <p className="text-sm text-orange-300/80">
                            A Evolution API não está respondendo em <code className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-300 text-xs">http://localhost:8081</code>.
                            Inicie-a com o Docker:
                        </p>
                        <div className="rounded-lg bg-black/40 border border-orange-500/20 px-4 py-3 font-mono text-xs text-emerald-300 flex items-start gap-2">
                            <Terminal className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p><span className="text-muted-foreground"># Na pasta do projeto:</span></p>
                                <p>docker-compose up evolution -d</p>
                                <p><span className="text-muted-foreground text-[10px]"># Aguarde 10-15s e clique em "Atualizar" acima</span></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Card 1: Status & Connection ── */}
                <section className="rounded-2xl border border-border bg-secondary/30 p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                            <Wifi className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-card-foreground">Status da Conexão</h2>
                            <p className="text-xs text-muted-foreground">Evolution API · Instância Legacy · Porta 8081</p>
                        </div>
                    </div>

                    {loadingStatus ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Verificando status…
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {statusInfo.phone && (
                                <div className="rounded-lg bg-muted/30 px-4 py-3 w-fit">
                                    <p className="text-xs text-muted-foreground mb-1">Número conectado</p>
                                    <div className="flex items-center gap-1.5 text-card-foreground font-medium text-sm">
                                        <Phone className="h-3.5 w-3.5 text-accent" />
                                        +{statusInfo.phone}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                {!isConnected ? (
                                    <button
                                        onClick={handleConnect}
                                        disabled={loadingConnect}
                                        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                                    >
                                        {loadingConnect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                        {loadingConnect ? "Conectando…" : "Conectar WhatsApp"}
                                    </button>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm font-medium text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            WhatsApp Conectado e Ativo
                                        </div>
                                        <button
                                            onClick={handleDisconnect}
                                            disabled={loadingDisconnect}
                                            className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
                                        >
                                            {loadingDisconnect
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <LogOut className="h-4 w-4" />}
                                            {loadingDisconnect ? "Desconectando…" : "Desconectar"}
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={fetchStatus}
                                    className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm text-muted-foreground transition hover:text-card-foreground"
                                >
                                    <RefreshCw className="h-4 w-4" /> Atualizar Status
                                </button>
                            </div>

                            {connectError && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    {connectError}
                                </div>
                            )}

                            {qrPollActive && !qrBase64 && (
                                <div className="flex items-center gap-2 text-yellow-400/80 text-xs">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Aguardando QR Code da Evolution API…
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* ── Card 2: QR Code ── */}
                {!isConnected && (
                    <section className="rounded-2xl border border-border bg-secondary/30 p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                                    <QrCode className="h-5 w-5 text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-card-foreground">QR Code</h2>
                                    <p className="text-xs text-muted-foreground">Escaneie para vincular o número</p>
                                </div>
                            </div>
                            {qrBase64 && (
                                <button
                                    onClick={() => { setQrBase64(null); setQrPollActive(true); }}
                                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground transition hover:text-card-foreground"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" /> Novo QR
                                </button>
                            )}
                        </div>

                        {qrBase64 ? (
                            <div className="flex flex-col items-center gap-5">
                                <div className="rounded-2xl bg-white p-4 shadow-xl ring-4 ring-accent/20">
                                    <img
                                        src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                                        alt="QR Code WhatsApp"
                                        className="h-56 w-56 object-contain"
                                    />
                                </div>
                                <div className="text-center space-y-2 max-w-xs">
                                    <p className="text-sm font-semibold text-card-foreground">Como escanear</p>
                                    <ol className="text-xs text-muted-foreground space-y-1.5 text-left">
                                        <li className="flex items-start gap-2"><span className="text-accent font-bold">1.</span> Abra o WhatsApp no celular</li>
                                        <li className="flex items-start gap-2"><span className="text-accent font-bold">2.</span> Toque em ⋮ Menu → <strong>Dispositivos Vinculados</strong></li>
                                        <li className="flex items-start gap-2"><span className="text-accent font-bold">3.</span> Toque em <strong>Vincular um Dispositivo</strong></li>
                                        <li className="flex items-start gap-2"><span className="text-accent font-bold">4.</span> Aponte a câmera para o QR Code acima</li>
                                    </ol>
                                    <p className="text-[10px] text-muted-foreground pt-1">O QR Code expira em ~60 segundos. Clique em "Novo QR" se expirar.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 text-center">
                                {qrPollActive ? (
                                    <>
                                        <Loader2 className="h-10 w-10 text-accent animate-spin" />
                                        <div>
                                            <p className="text-sm font-medium text-card-foreground">Gerando QR Code…</p>
                                            <p className="text-xs text-muted-foreground mt-1">Aguarde, isso pode levar alguns segundos</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="h-10 w-10 text-muted-foreground/40" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Clique em <strong className="text-card-foreground">Conectar WhatsApp</strong> acima</p>
                                            <p className="text-xs text-muted-foreground mt-1">O QR Code aparecerá aqui automaticamente</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {/* ── Card 3: Test Message ── */}
                <section className="rounded-2xl border border-border bg-secondary/30 p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                            <MessageSquare className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-card-foreground">Testar Envio de Mensagem</h2>
                            <p className="text-xs text-muted-foreground">Valide se o bot consegue enviar mensagens via WhatsApp</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Número de destino (com DDI e DDD, sem espaços)
                            </label>
                            <div className="flex items-center rounded-lg border border-border bg-muted overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                                <span className="px-3 py-2.5 text-sm text-muted-foreground border-r border-border">+</span>
                                <input
                                    type="tel"
                                    placeholder="5531999999999"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                Mensagem de teste
                            </label>
                            <textarea
                                rows={2}
                                value={testMsg}
                                onChange={(e) => setTestMsg(e.target.value)}
                                className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        <button
                            onClick={handleTest}
                            disabled={loadingTest || !testPhone.trim() || !isConnected}
                            title={!isConnected ? "Conecte o WhatsApp primeiro" : ""}
                            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                        >
                            {loadingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {loadingTest ? "Enviando…" : "Enviar Mensagem"}
                        </button>

                        {!isConnected && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5" />
                                {isOffline ? "Inicie a Evolution API primeiro" : "Conecte ao WhatsApp para enviar mensagens"}
                            </p>
                        )}

                        {testResult && (
                            <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${testResult.success
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                                }`}>
                                {testResult.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                                {testResult.message}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Info Footer ── */}
                <div className="rounded-xl border border-border bg-muted/10 px-5 py-4 text-xs text-muted-foreground space-y-1.5">
                    <p className="font-medium text-card-foreground/80 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" /> Como funciona a integração
                    </p>
                    <p>O bot usa a <strong className="text-card-foreground/70">Evolution API</strong> como bridge para o WhatsApp. Após escanear o QR, o número fica vinculado e todas as mensagens recebidas são respondidas automaticamente pelo bot de IA.</p>
                    <p className="pt-1">Webhook configurado automaticamente para: <code className="rounded bg-muted px-1 py-0.5 text-accent">http://SEU-SERVIDOR:3001/api/webhook/whatsapp</code></p>
                </div>
            </div>
        </div>
    );
};

export default Setup;
