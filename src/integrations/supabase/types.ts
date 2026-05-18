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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_balances: {
        Row: {
          account_id: string
          closing_balance: number
          debit_total: number
          id: string
          kredit_total: number
          opening_balance: number
          period_month: number
          period_year: number
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          closing_balance?: number
          debit_total?: number
          id?: string
          kredit_total?: number
          opening_balance?: number
          period_month: number
          period_year: number
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          closing_balance?: number
          debit_total?: number
          id?: string
          kredit_total?: number
          opening_balance?: number
          period_month?: number
          period_year?: number
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          created_at: string
          id: string
          jenis_unit: Database["public"]["Enums"]["unit_jenis"]
          kode_unit: string
          nama_unit: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jenis_unit?: Database["public"]["Enums"]["unit_jenis"]
          kode_unit: string
          nama_unit: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jenis_unit?: Database["public"]["Enums"]["unit_jenis"]
          kode_unit?: string
          nama_unit?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          created_at: string
          created_from_template: boolean
          id: string
          is_active: boolean
          is_header: boolean
          is_postable: boolean
          is_system: boolean
          kode: string
          level: number
          nama: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id: string | null
          tenant_id: string
          tipe: Database["public"]["Enums"]["account_type"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_from_template?: boolean
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_postable?: boolean
          is_system?: boolean
          kode: string
          level?: number
          nama: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          tenant_id: string
          tipe: Database["public"]["Enums"]["account_type"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_from_template?: boolean
          id?: string
          is_active?: boolean
          is_header?: boolean
          is_postable?: boolean
          is_system?: boolean
          kode?: string
          level?: number
          nama?: string
          normal_balance?: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          tenant_id?: string
          tipe?: Database["public"]["Enums"]["account_type"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_templates: {
        Row: {
          created_at: string
          id: string
          is_header: boolean
          is_postable: boolean
          is_system: boolean
          jenis_unit: Database["public"]["Enums"]["unit_jenis"] | null
          kode: string
          level: number
          nama: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_kode: string | null
          scope: string
          sort_order: number
          tipe: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_header?: boolean
          is_postable?: boolean
          is_system?: boolean
          jenis_unit?: Database["public"]["Enums"]["unit_jenis"] | null
          kode: string
          level?: number
          nama: string
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_kode?: string | null
          scope: string
          sort_order?: number
          tipe: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_header?: boolean
          is_postable?: boolean
          is_system?: boolean
          jenis_unit?: Database["public"]["Enums"]["unit_jenis"] | null
          kode?: string
          level?: number
          nama?: string
          normal_balance?: Database["public"]["Enums"]["normal_balance"]
          parent_kode?: string | null
          scope?: string
          sort_order?: number
          tipe?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: []
      }
      journal_items: {
        Row: {
          account_id: string
          created_at: string
          debit: number
          deskripsi: string | null
          id: string
          journal_id: string
          kredit: number
          sort_order: number
        }
        Insert: {
          account_id: string
          created_at?: string
          debit?: number
          deskripsi?: string | null
          id?: string
          journal_id: string
          kredit?: number
          sort_order?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          debit?: number
          deskripsi?: string | null
          id?: string
          journal_id?: string
          kredit?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_items_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          created_by: string | null
          deskripsi: string | null
          id: string
          nomor: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          nomor: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          nomor?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          tanggal?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_tenant_id: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          default_tenant_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          default_tenant_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_tenant_id_fkey"
            columns: ["default_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_registrations: {
        Row: {
          agama: string | null
          alamat: string | null
          created_at: string
          email: string
          email_akses: string
          gender: string | null
          id: string
          nama_bumdes: string
          nama_desa: string
          nama_kecamatan: string
          nama_pemohon: string
          nomor_whatsapp: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["registration_status"]
          tenant_id: string | null
        }
        Insert: {
          agama?: string | null
          alamat?: string | null
          created_at?: string
          email: string
          email_akses: string
          gender?: string | null
          id?: string
          nama_bumdes: string
          nama_desa: string
          nama_kecamatan: string
          nama_pemohon: string
          nomor_whatsapp?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          tenant_id?: string | null
        }
        Update: {
          agama?: string | null
          alamat?: string | null
          created_at?: string
          email?: string
          email_akses?: string
          gender?: string | null
          id?: string
          nama_bumdes?: string
          nama_desa?: string
          nama_kecamatan?: string
          nama_pemohon?: string
          nomor_whatsapp?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          alamat: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          expired_at: string | null
          id: string
          kode_bumdes: string
          nama_bumdes: string
          nama_desa: string
          nama_kecamatan: string
          nomor_whatsapp: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          expired_at?: string | null
          id?: string
          kode_bumdes: string
          nama_bumdes: string
          nama_desa: string
          nama_kecamatan: string
          nomor_whatsapp?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          expired_at?: string | null
          id?: string
          kode_bumdes?: string
          nama_bumdes?: string
          nama_desa?: string
          nama_kecamatan?: string
          nomor_whatsapp?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_journal_to_balances: {
        Args: { _direction: number; _journal_id: string }
        Returns: undefined
      }
      approve_tenant_registration: {
        Args: { _director_user_id: string; _registration_id: string }
        Returns: Json
      }
      generate_next_account_code: {
        Args: { _parent_id: string; _tenant_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      reject_tenant_registration: {
        Args: { _reason: string; _registration_id: string }
        Returns: undefined
      }
      seed_tenant_coa: { Args: { _tenant_id: string }; Returns: undefined }
      seed_unit_coa: { Args: { _unit_id: string }; Returns: undefined }
      validate_journal_balance: {
        Args: { _journal_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_role:
        | "super_admin_platform"
        | "direktur_bumdes"
        | "admin_bumdes"
        | "manager_unit"
        | "operator_unit"
        | "kasir"
      journal_status: "draft" | "posted" | "void"
      normal_balance: "D" | "K"
      registration_status: "pending" | "approved" | "rejected"
      tenant_status: "pending" | "active" | "suspended"
      unit_jenis:
        | "wisata"
        | "simpan_pinjam"
        | "air"
        | "dagang"
        | "peternakan"
        | "jasa"
        | "lainnya"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: [
        "super_admin_platform",
        "direktur_bumdes",
        "admin_bumdes",
        "manager_unit",
        "operator_unit",
        "kasir",
      ],
      journal_status: ["draft", "posted", "void"],
      normal_balance: ["D", "K"],
      registration_status: ["pending", "approved", "rejected"],
      tenant_status: ["pending", "active", "suspended"],
      unit_jenis: [
        "wisata",
        "simpan_pinjam",
        "air",
        "dagang",
        "peternakan",
        "jasa",
        "lainnya",
      ],
    },
  },
} as const
