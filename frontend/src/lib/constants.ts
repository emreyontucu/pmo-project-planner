// Real-world project lifecycle (Aktif/Beklemede/Tamamlandı/İptal Edildi) — distinct from the
// Draft/Final "plan is complete enough to publish" gate shown as the status badge.
export const PROJECT_BUSINESS_STATUSES = ["Aktif", "Beklemede", "Tamamlandı", "İptal Edildi"] as const;

export interface SectorDefinition {
  id: string;
  name: string;
  description: string;
  is_group_wide?: boolean;
  companies: string[];
}

export const PROJECT_SECTORS: SectorDefinition[] = [
  {
    id: "vestel",
    name: "Vestel",
    description: "Tüketici Elektroniği, Beyaz Eşya, Mobilite ve Ticaret",
    companies: [
      "Vestel Manisa",
      "Vestel Mobilite",
      "Vestel İstanbul Ticaret Şube",
    ],
  },
  {
    id: "enerji",
    name: "Enerji",
    description: "Yenilenebilir Enerji, Şarj İstasyonları ve Dağıtım",
    companies: [
      "ZES (Zorlu Energy Solutions)",
      "Zorlu Osmangazi Elektrik Dağıtım",
    ],
  },
  {
    id: "maden",
    name: "Maden",
    description: "Madencilik ve Metalurji İşletmeleri",
    companies: [
      "Meta Nikel Madencilik",
      "Zorlu Maden İşletmeleri",
    ],
  },
  {
    id: "tekstil",
    name: "Tekstil",
    description: "Ev Tekstili, İplik ve Kumaş Üretim Tesisleri",
    companies: [
      "Lüleburgaz Şube (Zorluteks)",
      "İstanbul Ticaret Şube (Korteks)",
    ],
  },
  {
    id: "holding",
    name: "Holding",
    description: "Tüm Sektörleri ve Grup Şirketlerini Kapsayan Merkezi Projeler (Zorlu Akademi, EBA vb.)",
    is_group_wide: true,
    companies: [
      "Zorlu Holding (Merkezi / Tüm Sektörler)",
      "Zorlu Akademi",
      "Merkezi İnsan Kaynakları & EBA",
      "Merkezi Bilgi Teknolojileri",
    ],
  },
];

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

export interface PhaseInfo {
  code: string;
  title: string;
  description: string;
  badgeColor: string;
}

export const PROJECT_PHASES_DETAILED: PhaseInfo[] = [
  {
    code: "S1",
    title: "İş ve Veri Analizi / Kavramsal Tasarım",
    description: "İş hedeflerinin belirlenmesi, kapsam analizi, gereksinim tespiti ve kavramsal mimarinin oluşturulması.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    code: "S2",
    title: "Veri Toplama ve Hazırlık",
    description: "Veri kaynaklarının entegrasyonu, veri çıkarma, temizleme, önişleme ve altyapı hazırlığı.",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    code: "S3",
    title: "Geliştirme / Modelleme",
    description: "Yazılım geliştirme, algoritmik ve analitik modelleme, çekirdek fonksiyonların kodlanması.",
    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    code: "S4",
    title: "Test / Model Değerlendirme",
    description: "Model performans değerlendirmesi, kullanıcı kabul testleri (UAT), sistem ve güvenlik testleri.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    code: "S5",
    title: "Canlı Geçiş / Gözlem / Kapanış",
    description: "Canlı ortama geçiş, son kullanıcı eğitimleri ve nihai proje teslimi/kapanışı.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];
