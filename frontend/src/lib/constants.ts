// Real-world project lifecycle (Aktif/Beklemede/Tamamlandı) — distinct from the
// Draft/Final "plan is complete enough to publish" gate shown as the status badge.
export const PROJECT_BUSINESS_STATUSES = ["Aktif", "Beklemede", "Tamamlandı"] as const;

export const TASK_PRIORITIES = ["Kritik", "Yüksek", "Orta", "Düşük"] as const;

export const TASK_STATUSES = ["Başlamadı", "Devam Ediyor", "Beklemede", "Tamamlandı", "İptal Edildi"] as const;

// Fixed project-phase set used by the company's "Görev Takip" Excel template.
export const PROJECT_PHASES = [
  { code: "S1", label: "İş ve Veri Analizi / Kavramsal Tasarım" },
  { code: "S2", label: "Veri Toplama ve Hazırlık" },
  { code: "S3", label: "Geliştirme / Modelleme" },
  { code: "S4", label: "Test / Model Değerlendirme" },
  { code: "S5", label: "Canlı Geçiş / Gözlem / Kapanış" },
] as const;
