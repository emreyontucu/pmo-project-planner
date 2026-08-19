# Real-world project lifecycle (Aktif/Beklemede/Tamamlandı) — distinct from Project.status
# (Draft/Final), which is the internal "plan is complete enough to publish" gate.
PROJECT_BUSINESS_STATUSES = ["Aktif", "Beklemede", "Tamamlandı"]

TASK_PRIORITIES = ["Kritik", "Yüksek", "Orta", "Düşük"]

TASK_STATUSES = ["Başlamadı", "Devam Ediyor", "Beklemede", "Tamamlandı", "İptal Edildi"]

# Fixed project-phase set used by the company's "Görev Takip" Excel template.
# Each task is tagged with one of these phases (not a separate milestone row).
PROJECT_PHASES = [
    ("S1", "İş ve Veri Analizi / Kavramsal Tasarım"),
    ("S2", "Veri Toplama ve Hazırlık"),
    ("S3", "Geliştirme / Modelleme"),
    ("S4", "Test / Model Değerlendirme"),
    ("S5", "Canlı Geçiş / Gözlem / Kapanış"),
]
