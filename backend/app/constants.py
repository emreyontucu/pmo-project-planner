# Real-world project lifecycle (Aktif/Beklemede/Tamamlandı/İptal Edildi) — distinct from Project.status
# (Draft/Final), which is the internal "plan is complete enough to publish" gate.
PROJECT_BUSINESS_STATUSES = ["Aktif", "Beklemede", "Tamamlandı", "İptal Edildi"]

# Corporate Sectors & Companies
PROJECT_SECTORS = [
    {
        "id": "vestel",
        "name": "Vestel",
        "description": "Tüketici Elektroniği, Beyaz Eşya, Mobilite ve Ticaret",
        "companies": [
            "Vestel Manisa",
            "Vestel Mobilite",
            "Vestel İstanbul Ticaret Şube",
        ],
    },
    {
        "id": "enerji",
        "name": "Enerji",
        "description": "Yenilenebilir Enerji, Şarj İstasyonları ve Dağıtım",
        "companies": [
            "ZES (Zorlu Energy Solutions)",
            "Zorlu Osmangazi Elektrik Dağıtım",
        ],
    },
    {
        "id": "maden",
        "name": "Maden",
        "description": "Madencilik ve Metalurji İşletmeleri",
        "companies": [
            "Meta Nikel Madencilik",
            "Zorlu Maden İşletmeleri",
        ],
    },
    {
        "id": "tekstil",
        "name": "Tekstil",
        "description": "Ev Tekstili, İplik ve Kumaş Üretim Tesisleri",
        "companies": [
            "Lüleburgaz Şube (Zorluteks)",
            "İstanbul Ticaret Şube (Korteks)",
        ],
    },
    {
        "id": "holding",
        "name": "Holding",
        "description": "Tüm Sektörleri ve Grup Şirketlerini Kapsayan Merkezi Projeler (Zorlu Akademi, EBA vb.)",
        "is_group_wide": True,
        "companies": [
            "Zorlu Holding (Merkezi / Tüm Sektörler)",
            "Zorlu Akademi",
            "Merkezi İnsan Kaynakları & EBA",
            "Merkezi Bilgi Teknolojileri",
        ],
    },
]

PROJECT_SECTOR_NAMES = [s["name"] for s in PROJECT_SECTORS]

TASK_PRIORITIES = ["Kritik", "Yüksek", "Orta", "Düşük"]

TASK_STATUSES = ["Başlamadı", "Devam Ediyor", "Beklemede", "Tamamlandı", "İptal Edildi"]

# Fixed project-phase set used by the company's "Görev Takip" Excel template.
PROJECT_PHASES = [
    ("S1", "İş ve Veri Analizi / Kavramsal Tasarım"),
    ("S2", "Veri Toplama ve Hazırlık"),
    ("S3", "Geliştirme / Modelleme"),
    ("S4", "Test / Model Değerlendirme"),
    ("S5", "Canlı Geçiş / Gözlem / Kapanış"),
]

PROJECT_PHASES_DICT = {
    "S1": {
        "title": "İş ve Veri Analizi / Kavramsal Tasarım",
        "description": "İş hedeflerinin ve veri gereksinimlerinin netleştirilmesi, kapsam analizi ve kavramsal tasarımın oluşturulması.",
    },
    "S2": {
        "title": "Veri Toplama ve Hazırlık",
        "description": "Gerekli veri kaynaklarının tespiti, veri aktarımı, veri temizliği ve önişleme süreçleri.",
    },
    "S3": {
        "title": "Geliştirme / Modelleme",
        "description": "Algoritmik ve analitik modellerin geliştirilmesi, sistem fonksiyonlarının kodlanması ve entegrasyonu.",
    },
    "S4": {
        "title": "Test / Model Değerlendirme",
        "description": "Model performans değerlendirmesi, kullanıcı kabul testleri (UAT), sistem ve güvenlik testleri.",
    },
    "S5": {
        "title": "Canlı Geçiş / Gözlem / Kapanış",
        "description": "Canlı ortama aktarım, son kullanıcı eğitimleri ve proje kapanış onayı.",
    },
}
