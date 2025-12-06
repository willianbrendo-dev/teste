export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      caixa_diario: {
        Row: {
          aberto_em: string
          aberto_por: string | null
          created_at: string
          data: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          observacoes_abertura: string | null
          observacoes_fechamento: string | null
          status: string
          updated_at: string
          valor_abertura: number
          valor_fechamento: number | null
        }
        Insert: {
          aberto_em?: string
          aberto_por?: string | null
          created_at?: string
          data: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: string
          updated_at?: string
          valor_abertura: number
          valor_fechamento?: number | null
        }
        Update: {
          aberto_em?: string
          aberto_por?: string | null
          created_at?: string
          data?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          observacoes_abertura?: string | null
          observacoes_fechamento?: string | null
          status?: string
          updated_at?: string
          valor_abertura?: number
          valor_fechamento?: number | null
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          cor: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          cor?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      checklists: {
        Row: {
          alto_falante: Database["public"]["Enums"]["component_status"] | null
          auricular: Database["public"]["Enums"]["component_status"] | null
          biometria: Database["public"]["Enums"]["component_status"] | null
          bluetooth: Database["public"]["Enums"]["component_status"] | null
          botao_home: Database["public"]["Enums"]["component_status"] | null
          botao_power: Database["public"]["Enums"]["component_status"] | null
          botao_volume: Database["public"]["Enums"]["component_status"] | null
          camera_frontal: Database["public"]["Enums"]["component_status"] | null
          camera_traseira:
            | Database["public"]["Enums"]["component_status"]
            | null
          carregador: Database["public"]["Enums"]["component_status"] | null
          conector_carga: Database["public"]["Enums"]["component_status"] | null
          created_at: string
          created_by: string | null
          face_id: Database["public"]["Enums"]["component_status"] | null
          flash: Database["public"]["Enums"]["component_status"] | null
          fone_ouvido: Database["public"]["Enums"]["component_status"] | null
          id: string
          microfone: Database["public"]["Enums"]["component_status"] | null
          observacoes: string | null
          ordem_servico_id: string
          parafuso: Database["public"]["Enums"]["component_status"] | null
          sensor_proximidade:
            | Database["public"]["Enums"]["component_status"]
            | null
          sim_chip: Database["public"]["Enums"]["component_status"] | null
          situacao_carcaca:
            | Database["public"]["Enums"]["component_status"]
            | null
          situacao_touch: Database["public"]["Enums"]["component_status"] | null
          slot_sim: Database["public"]["Enums"]["component_status"] | null
          status: Database["public"]["Enums"]["checklist_status"]
          tipo: Database["public"]["Enums"]["checklist_type"]
          updated_at: string
          vibra_call: Database["public"]["Enums"]["component_status"] | null
          wifi: Database["public"]["Enums"]["component_status"] | null
        }
        Insert: {
          alto_falante?: Database["public"]["Enums"]["component_status"] | null
          auricular?: Database["public"]["Enums"]["component_status"] | null
          biometria?: Database["public"]["Enums"]["component_status"] | null
          bluetooth?: Database["public"]["Enums"]["component_status"] | null
          botao_home?: Database["public"]["Enums"]["component_status"] | null
          botao_power?: Database["public"]["Enums"]["component_status"] | null
          botao_volume?: Database["public"]["Enums"]["component_status"] | null
          camera_frontal?:
            | Database["public"]["Enums"]["component_status"]
            | null
          camera_traseira?:
            | Database["public"]["Enums"]["component_status"]
            | null
          carregador?: Database["public"]["Enums"]["component_status"] | null
          conector_carga?:
            | Database["public"]["Enums"]["component_status"]
            | null
          created_at?: string
          created_by?: string | null
          face_id?: Database["public"]["Enums"]["component_status"] | null
          flash?: Database["public"]["Enums"]["component_status"] | null
          fone_ouvido?: Database["public"]["Enums"]["component_status"] | null
          id?: string
          microfone?: Database["public"]["Enums"]["component_status"] | null
          observacoes?: string | null
          ordem_servico_id: string
          parafuso?: Database["public"]["Enums"]["component_status"] | null
          sensor_proximidade?:
            | Database["public"]["Enums"]["component_status"]
            | null
          sim_chip?: Database["public"]["Enums"]["component_status"] | null
          situacao_carcaca?:
            | Database["public"]["Enums"]["component_status"]
            | null
          situacao_touch?:
            | Database["public"]["Enums"]["component_status"]
            | null
          slot_sim?: Database["public"]["Enums"]["component_status"] | null
          status?: Database["public"]["Enums"]["checklist_status"]
          tipo: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
          vibra_call?: Database["public"]["Enums"]["component_status"] | null
          wifi?: Database["public"]["Enums"]["component_status"] | null
        }
        Update: {
          alto_falante?: Database["public"]["Enums"]["component_status"] | null
          auricular?: Database["public"]["Enums"]["component_status"] | null
          biometria?: Database["public"]["Enums"]["component_status"] | null
          bluetooth?: Database["public"]["Enums"]["component_status"] | null
          botao_home?: Database["public"]["Enums"]["component_status"] | null
          botao_power?: Database["public"]["Enums"]["component_status"] | null
          botao_volume?: Database["public"]["Enums"]["component_status"] | null
          camera_frontal?:
            | Database["public"]["Enums"]["component_status"]
            | null
          camera_traseira?:
            | Database["public"]["Enums"]["component_status"]
            | null
          carregador?: Database["public"]["Enums"]["component_status"] | null
          conector_carga?:
            | Database["public"]["Enums"]["component_status"]
            | null
          created_at?: string
          created_by?: string | null
          face_id?: Database["public"]["Enums"]["component_status"] | null
          flash?: Database["public"]["Enums"]["component_status"] | null
          fone_ouvido?: Database["public"]["Enums"]["component_status"] | null
          id?: string
          microfone?: Database["public"]["Enums"]["component_status"] | null
          observacoes?: string | null
          ordem_servico_id?: string
          parafuso?: Database["public"]["Enums"]["component_status"] | null
          sensor_proximidade?:
            | Database["public"]["Enums"]["component_status"]
            | null
          sim_chip?: Database["public"]["Enums"]["component_status"] | null
          situacao_carcaca?:
            | Database["public"]["Enums"]["component_status"]
            | null
          situacao_touch?:
            | Database["public"]["Enums"]["component_status"]
            | null
          slot_sim?: Database["public"]["Enums"]["component_status"] | null
          status?: Database["public"]["Enums"]["checklist_status"]
          tipo?: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
          vibra_call?: Database["public"]["Enums"]["component_status"] | null
          wifi?: Database["public"]["Enums"]["component_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "checklists_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apelido: string | null
          bairro: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          apelido?: string | null
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          apelido?: string | null
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      garantias: {
        Row: {
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_pagamento: string | null
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          ordem_servico_id: string
          status: string
          termo_garantia_url: string | null
          updated_at: string
          valor_servico: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          ordem_servico_id: string
          status?: string
          termo_garantia_url?: string | null
          updated_at?: string
          valor_servico?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          ordem_servico_id?: string
          status?: string
          termo_garantia_url?: string | null
          updated_at?: string
          valor_servico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      modelos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          marca_id: string
          nome: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          marca_id: string
          nome: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          marca_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_pecas: {
        Row: {
          created_at: string
          id: string
          ordem_id: string
          peca_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          ordem_id: string
          peca_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          ordem_id?: string
          peca_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_pecas_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          acessorios_entregues: string | null
          cliente_id: string
          cor_aparelho: string | null
          created_at: string
          created_by: string | null
          data_prevista_entrega: string | null
          descricao_problema: string | null
          eh_garantia: boolean | null
          estado_fisico: string | null
          fotos_aparelho: string[] | null
          id: string
          marca_id: string | null
          modelo_id: string | null
          numero: number
          numero_serie: string | null
          observacoes: string | null
          os_original_id: string | null
          possivel_reparo: string | null
          relato_cliente: string | null
          senha_aparelho: string | null
          senha_desenho_url: string | null
          servico_realizar: string | null
          situacao_atual: string | null
          status: string
          termos_servico: string[] | null
          tipo_ordem: string | null
          tipo_senha: string | null
          updated_at: string
          valor_adiantamento: number | null
          valor_entrada: number | null
          valor_estimado: number | null
          valor_total: number | null
        }
        Insert: {
          acessorios_entregues?: string | null
          cliente_id: string
          cor_aparelho?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista_entrega?: string | null
          descricao_problema?: string | null
          eh_garantia?: boolean | null
          estado_fisico?: string | null
          fotos_aparelho?: string[] | null
          id?: string
          marca_id?: string | null
          modelo_id?: string | null
          numero?: number
          numero_serie?: string | null
          observacoes?: string | null
          os_original_id?: string | null
          possivel_reparo?: string | null
          relato_cliente?: string | null
          senha_aparelho?: string | null
          senha_desenho_url?: string | null
          servico_realizar?: string | null
          situacao_atual?: string | null
          status?: string
          termos_servico?: string[] | null
          tipo_ordem?: string | null
          tipo_senha?: string | null
          updated_at?: string
          valor_adiantamento?: number | null
          valor_entrada?: number | null
          valor_estimado?: number | null
          valor_total?: number | null
        }
        Update: {
          acessorios_entregues?: string | null
          cliente_id?: string
          cor_aparelho?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista_entrega?: string | null
          descricao_problema?: string | null
          eh_garantia?: boolean | null
          estado_fisico?: string | null
          fotos_aparelho?: string[] | null
          id?: string
          marca_id?: string | null
          modelo_id?: string | null
          numero?: number
          numero_serie?: string | null
          observacoes?: string | null
          os_original_id?: string | null
          possivel_reparo?: string | null
          relato_cliente?: string | null
          senha_aparelho?: string | null
          senha_desenho_url?: string | null
          servico_realizar?: string | null
          situacao_atual?: string | null
          status?: string
          termos_servico?: string[] | null
          tipo_ordem?: string | null
          tipo_senha?: string | null
          updated_at?: string
          valor_adiantamento?: number | null
          valor_entrada?: number | null
          valor_estimado?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_os_original_id_fkey"
            columns: ["os_original_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_estoque: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          preco_unitario: number | null
          quantidade: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          preco_unitario?: number | null
          quantidade?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          preco_unitario?: number | null
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          attempts: number | null
          created_at: string
          device_id: string | null
          error_message: string | null
          escpos_data_base64: string
          finished_at: string | null
          id: string
          job_id: string
          max_attempts: number | null
          os_id: string | null
          processing_duration_ms: number | null
          processing_started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          escpos_data_base64: string
          finished_at?: string | null
          id?: string
          job_id: string
          max_attempts?: number | null
          os_id?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          device_id?: string | null
          error_message?: string | null
          escpos_data_base64?: string
          finished_at?: string | null
          id?: string
          job_id?: string
          max_attempts?: number | null
          os_id?: string | null
          processing_duration_ms?: number | null
          processing_started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_jobs_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_super_admin: boolean | null
          nome: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_super_admin?: boolean | null
          nome?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean | null
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          metodo_pagamento: string | null
          ordem_servico_id: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          ordem_servico_id?: string | null
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          ordem_servico_id?: string | null
          tipo?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes_categorias: {
        Row: {
          categoria_id: string
          created_at: string | null
          id: string
          transacao_id: string
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          id?: string
          transacao_id: string
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          id?: string
          transacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_categorias_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_checklist_atraso: { Args: never; Returns: undefined }
      create_audit_log: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      get_next_pending_job: {
        Args: { p_device_id: string }
        Returns: {
          attempts: number
          device_id: string
          escpos_data_base64: string
          id: string
          job_id: string
          os_id: string
        }[]
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      update_job_status: {
        Args: { p_error_message?: string; p_job_id: string; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "atendente" | "print_bridge"
      checklist_status: "pendente" | "concluido" | "em_atraso"
      checklist_type: "entrada" | "saida"
      component_status: "ok" | "com_defeito" | "nao_testado" | "nao_possui"
      transaction_type: "receita" | "despesa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "atendente", "print_bridge"],
      checklist_status: ["pendente", "concluido", "em_atraso"],
      checklist_type: ["entrada", "saida"],
      component_status: ["ok", "com_defeito", "nao_testado", "nao_possui"],
      transaction_type: ["receita", "despesa"],
    },
  },
} as const
