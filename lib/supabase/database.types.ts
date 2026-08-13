export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ApplicationStatus =
  | "aplicado"
  | "em_processo"
  | "entrevista"
  | "rejeitado"
  | "arquivado";

export type AnalysisStatus =
  | "pending"
  | "completed"
  | "failed"
  | "nao_aplicavel";

export type CurriculumInputKind = "text" | "pdf";

export type HiringModel =
  | "clt"
  | "pj"
  | "freelancer"
  | "estagio"
  | "temporario"
  | "outro";

export type Database = {
  public: {
    Tables: {
      application_channel_assignments: {
        Row: {
          application_id: string;
          channel_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          application_id: string;
          channel_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          application_id?: string;
          channel_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_channel_assignments_application_owner_fkey";
            columns: ["application_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "candidaturas";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "application_channel_assignments_channel_owner_fkey";
            columns: ["channel_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "application_channels";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      application_channels: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          normalized_name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          normalized_name?: never;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          normalized_name?: never;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      candidaturas: {
        Row: {
          analysis_status: AnalysisStatus;
          id: string;
          user_id: string;
          vaga_titulo: string | null;
          empresa: string | null;
          carta_apresentacao: string | null;
          descricao_vaga: string | null;
          curriculo_original: string | null;
          curriculo_original_url: string | null;
          curriculo_input_kind: CurriculumInputKind | null;
          curriculo_arquivo_path: string | null;
          curriculo_arquivo_nome: string | null;
          curriculo_otimizado: string | null;
          email_outreach: string | null;
          error_code: string | null;
          last_error: string | null;
          modelo_contratacao: HiringModel | null;
          notas: string | null;
          retry_count: number;
          salario: string | null;
          skills_nao_dominadas: string[] | null;
          status: ApplicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          analysis_status?: AnalysisStatus;
          id?: string;
          user_id: string;
          vaga_titulo?: string | null;
          empresa?: string | null;
          carta_apresentacao?: string | null;
          descricao_vaga?: string | null;
          curriculo_original?: string | null;
          curriculo_original_url?: string | null;
          curriculo_input_kind?: CurriculumInputKind | null;
          curriculo_arquivo_path?: string | null;
          curriculo_arquivo_nome?: string | null;
          curriculo_otimizado?: string | null;
          email_outreach?: string | null;
          error_code?: string | null;
          last_error?: string | null;
          modelo_contratacao?: HiringModel | null;
          notas?: string | null;
          retry_count?: number;
          salario?: string | null;
          skills_nao_dominadas?: string[] | null;
          status?: ApplicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          analysis_status?: AnalysisStatus;
          id?: string;
          user_id?: string;
          vaga_titulo?: string | null;
          empresa?: string | null;
          carta_apresentacao?: string | null;
          descricao_vaga?: string | null;
          curriculo_original?: string | null;
          curriculo_original_url?: string | null;
          curriculo_input_kind?: CurriculumInputKind | null;
          curriculo_arquivo_path?: string | null;
          curriculo_arquivo_nome?: string | null;
          curriculo_otimizado?: string | null;
          email_outreach?: string | null;
          error_code?: string | null;
          last_error?: string | null;
          modelo_contratacao?: HiringModel | null;
          notas?: string | null;
          retry_count?: number;
          salario?: string | null;
          skills_nao_dominadas?: string[] | null;
          status?: ApplicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      canonicalize_application_channel_name: {
        Args: { value: string };
        Returns: string;
      };
      normalize_application_channel_name: {
        Args: { value: string };
        Returns: string;
      };
    };
    Enums: {
      hiring_model: HiringModel;
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Candidatura = Database["public"]["Tables"]["candidaturas"]["Row"];
export type ApplicationChannelRow =
  Database["public"]["Tables"]["application_channels"]["Row"];
export type ApplicationChannelAssignment =
  Database["public"]["Tables"]["application_channel_assignments"]["Row"];
