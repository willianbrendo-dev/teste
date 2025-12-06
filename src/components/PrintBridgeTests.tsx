import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FlaskConical,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PrintBridgeTestSuite, TestResult } from "@/lib/printer/print-bridge-tests";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PrintBridgeTestsProps {
  isNativeMode: boolean;
}

export function PrintBridgeTests({ isNativeMode }: PrintBridgeTestsProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    duration: number;
  } | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const testSuite = new PrintBridgeTestSuite(isNativeMode);
      const testResults = await testSuite.runAllTests();
      const testSummary = testSuite.getSummary();

      setResults(testResults);
      setSummary(testSummary);
    } catch (error) {
      console.error("[Tests] Erro ao executar testes:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleTestExpanded = (testName: string) => {
    setExpandedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testName)) {
        newSet.delete(testName);
      } else {
        newSet.add(testName);
      }
      return newSet;
    });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5" />
          Testes Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Execute testes automáticos para verificar o funcionamento do sistema Print Bridge.
          </AlertDescription>
        </Alert>

        <Button onClick={runTests} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando testes...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar Todos os Testes
            </>
          )}
        </Button>

        {summary && (
          <div className="p-4 rounded-lg bg-background/50 border border-border/30">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{summary.passed}</p>
                <p className="text-xs text-muted-foreground">Passaram</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{summary.failed}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{(summary.duration / 1000).toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground">Duração</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Resultados dos Testes:</p>
            {results.map((result, index) => (
              <Collapsible
                key={index}
                open={expandedTests.has(result.name)}
                onOpenChange={() => toggleTestExpanded(result.name)}
              >
                <div className="border border-border/30 rounded-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors">
                      {result.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{result.name}</p>
                        <p className="text-xs text-muted-foreground">{result.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {result.duration}ms
                        </Badge>
                        {expandedTests.has(result.name) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  {result.details && (
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0">
                        <div className="p-2 rounded bg-background/50 border border-border/20">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                            {result.details}
                          </pre>
                        </div>
                      </div>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
