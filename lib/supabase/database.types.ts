export type Database = {
  public: {
    Tables: {
      candidaturas: {
        Row: {
          id: string;
          user_id: string;
          vaga_titulo: string | null;
          empresa: string | null;
          descricao_vaga: string | null;
          curriculo_original: string | null;
          curriculo_otimizado: string | null;
          email_outreach: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vaga_titulo?: string | null;
          empresa?: string | null;
          descricao_vaga?: string | null;
          curriculo_original?: string | null;
          curriculo_otimizado?: string | null;
          email_outreach?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vaga_titulo?: string | null;
          empresa?: string | null;
          descricao_vaga?: string | null;
          curriculo_original?: string | null;
          curriculo_otimizado?: string | null;
          email_outreach?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Candidatura = Database["public"]["Tables"]["candidaturas"]["Row"];
