import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Clientes from "./pages/Clientes";
import Marcas from "./pages/Marcas";
import Modelos from "./pages/Modelos";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import OrdensServico from "./pages/OrdensServico";
import Estoque from "./pages/Estoque";
import Checklists from "./pages/Checklists";
import PrinterConfig from "./pages/PrinterConfig";
import Garantias from "./pages/Garantias";
import Financeiro from "./pages/Financeiro";
import Entregas from "./pages/Entregas";
import Relatorios from "./pages/Relatorios";
import PrintBridge from "./pages/PrintBridge";
import PrintBridgeProfile from "./pages/PrintBridgeProfile";
import PWADebug from "./pages/PWADebug";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/marcas" element={<Marcas />} />
            <Route path="/modelos" element={<Modelos />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/ordens-servico" element={<OrdensServico />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/checklists" element={<Checklists />} />
            <Route path="/impressora" element={<PrinterConfig />} />
            <Route path="/garantias" element={<Garantias />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/print-bridge" element={<PrintBridge />} />
            <Route path="/print-bridge/profile" element={<PrintBridgeProfile />} />
            <Route path="/pwa-debug" element={<PWADebug />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;