import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrintJob {
  id: string;
  job_id: string;
  os_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  processing_started_at: string | null;
  finished_at: string | null;
  processing_duration_ms: number | null;
}

interface PrintJobTimelineProps {
  osId?: string;
}

export function PrintJobTimeline({ osId }: PrintJobTimelineProps) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("print_jobs_timeline")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "print_jobs",
          filter: osId ? `os_id=eq.${osId}` : undefined,
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [osId]);

  async function loadJobs() {
    try {
      let query = supabase
        .from("print_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (osId) {
        query = query.eq("os_id", osId);
      }

      const { data, error } = await query.limit(3);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Erro ao carregar jobs:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(job: PrintJob) {
    switch (job.status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processando ({job.attempts}/{job.max_attempts})
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou ({job.attempts}/{job.max_attempts})
          </Badge>
        );
      default:
        return <Badge variant="outline">{job.status}</Badge>;
    }
  }

  function formatDuration(ms: number | null) {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Nenhum job de impressão encontrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timeline de Impressão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-2 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(job)}
                    <span className="text-sm text-muted-foreground font-mono">
                      #{job.job_id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Criado:</span>{" "}
                      <span className="font-medium">
                        {format(new Date(job.created_at), "dd/MM/yy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {job.processing_started_at && (
                      <div>
                        <span className="text-muted-foreground">Iniciado:</span>{" "}
                        <span className="font-medium">
                          {format(
                            new Date(job.processing_started_at),
                            "HH:mm:ss",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                    )}

                    {job.finished_at && (
                      <div>
                        <span className="text-muted-foreground">Finalizado:</span>{" "}
                        <span className="font-medium">
                          {format(new Date(job.finished_at), "HH:mm:ss", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {job.processing_duration_ms !== null && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Duração:</span>{" "}
                      <span className="font-medium font-mono">
                        {formatDuration(job.processing_duration_ms)}
                      </span>
                    </div>
                  )}

                  {job.error_message && (
                    <div className="mt-2 flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span className="text-destructive">{job.error_message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
