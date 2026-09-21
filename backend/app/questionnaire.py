import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel


class SuggestedTask(BaseModel):
    name: str
    phase: str  # S1..S5
    description: str
    sorumlu: str
    priority: str = "Orta"
    duration: int = 3
    is_milestone: bool = False
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None


class WBSQuestion(BaseModel):
    key: str
    category: str
    question: str
    description: str
    icon_type: str
    vendor_field_label: Optional[str] = None # e.g. "Penetrasyon Testi Yapacak Firma Adı"
    suggested_tasks: List[SuggestedTask]


WBS_QUESTIONS: List[WBSQuestion] = [
    WBSQuestion(
        key="server_hardware_analysis",
        category="Altyapı & Donanım Analizi",
        question="Projeye özel yeni sunucu/donanım ihtiyaç analizi ve kapasite planlaması yapılacak mı?",
        description="Donanım boyutlandırma, sunucu spesifikasyonları ve mimari altyapı analiz iş paketleri oluşturulur.",
        icon_type="server",
        suggested_tasks=[
            SuggestedTask(
                name="Sunucu ve Donanım İhtiyaç Analizi & Kapasite Planlaması",
                phase="S1",
                description="Kapasite planlaması, sunucu konfigürasyonu ve donanım teknik şartnamesinin hazırlanması.",
                sorumlu="Sistem & Altyapı Ekibi",
                priority="Yüksek",
                duration=4,
            ),
        ],
    ),
    WBSQuestion(
        key="hardware_procurement",
        category="Sipariş & Donanım Tedariği",
        question="Sunucu ve donanım bileşenleri için satın alma, sipariş ve tedarik süreci işletilecek mi?",
        description="Satın alma siparişi, tedarikçi teslimatı, sunucu montajı ve ağ ortam kurulum iş paketleri oluşturulur.",
        icon_type="server",
        suggested_tasks=[
            SuggestedTask(
                name="Sunucu / Donanım Sipariş ve Tedarik Süreci",
                phase="S1",
                description="Satın alma onaylarının alınması, siparişin geçilmesi ve donanım teslimatının takibi.",
                sorumlu="Satın Alma & Altyapı",
                priority="Yüksek",
                duration=7,
            ),
            SuggestedTask(
                name="Sunucu Kurulumu, Ağ ve Ortam Konfigürasyonu",
                phase="S2",
                description="İşletim sistemi kurulumu, firewall izinleri, port ve ağ yapılandırmasının tamamlanması.",
                sorumlu="Sistem Yöneticisi",
                priority="Yüksek",
                duration=4,
            ),
        ],
    ),
    WBSQuestion(
        key="api_purchasing_integration",
        category="API Satın Alma & Entegrasyon",
        question="Proje kapsamında ücretli dış servis / API satın alımı ve entegrasyonu yapılacak mı?",
        description="Ücretli API lisansı satın alma, arayüz sözleşmesi ve bağlantı geliştirme iş paketleri eklenir.",
        icon_type="plug",
        suggested_tasks=[
            SuggestedTask(
                name="Ücretli Dış Servis / API Satın Alma & Lisanslama",
                phase="S1",
                description="API sağlayıcısı ile sözleşme, lisans satın alma ve kimlik doğrulama anahtarlarının temini.",
                sorumlu="Satın Alma & Proje Yöneticisi",
                priority="Yüksek",
                duration=4,
            ),
            SuggestedTask(
                name="Dış API Spesifikasyonlarının Belirlenmesi & Entegrasyon Geliştirmesi",
                phase="S3",
                description="API bağlantılarının kodlanması, hata yönetimi ve veri alışverişi entegrasyon testleri.",
                sorumlu="Backend Geliştirici",
                priority="Yüksek",
                duration=6,
            ),
        ],
    ),
    WBSQuestion(
        key="security_pentest_vendor",
        category="Siber Güvenlik & Penetrasyon Satın Alma",
        question="Canlıya çıkış öncesi dış kaynaktan bağımsız sızma (penetrasyon) testi hizmeti satın alınacak mı?",
        description="Dış güvenlik firmasından penetrasyon testi satın alımı, sızma testi icrası ve güvenlik bulgularının kapatılması adımları eklenir.",
        icon_type="shield",
        vendor_field_label="Penetrasyonu Yapan Firma Adı",
        suggested_tasks=[
            SuggestedTask(
                name="Penetrasyon Testi Dış Hizmet Alımı & Ortam Hazırlığı",
                phase="S4",
                description="Dış güvenlik firması ile anlaşma, test kullanıcıları ve test ortam erişimlerinin sağlanması.",
                sorumlu="Siber Güvenlik & Satın Alma",
                priority="Yüksek",
                duration=3,
            ),
            SuggestedTask(
                name="Penetrasyon Testi İcrası & Güvenlik Bulgularının Kapatılması (Retest)",
                phase="S4",
                description="Raporlanan güvenlik açıklarının yazılım ekibi tarafından giderilmesi ve doğrulama testi.",
                sorumlu="Yazılım Ekibi & Dış Güvenlik Firması",
                priority="Kritik",
                duration=5,
            ),
        ],
    ),
    WBSQuestion(
        key="user_training",
        category="Eğitim & Değişim Yönetimi",
        question="Son kullanıcılara ve operasyon ekiplerine yüzyüze/online eğitimler verilecek mi?",
        description="Kullanıcı kılavuzu hazırlığı ve yüzyüze/online eğitim oturumlarının gerçekleştirilmesi iş paketleri eklenir.",
        icon_type="users",
        suggested_tasks=[
            SuggestedTask(
                name="Kullanıcı Kılavuzu ve Eğitim Materyallerinin Hazırlanması",
                phase="S5",
                description="Ekran kullanım dokümanları, SSS ve eğitim sunumlarının hazırlanması.",
                sorumlu="İş Analisti",
                priority="Orta",
                duration=3,
            ),
            SuggestedTask(
                name="Yüzyüze / Online Eğitimlerin Gerçekleştirilmesi",
                phase="S5",
                description="Kullanıcı gruplarına ve şube ekiplerine yüzyüze/online interaktif eğitimlerin verilmesi.",
                sorumlu="Proje Yöneticisi & Eğitmen",
                priority="Yüksek",
                duration=4,
            ),
        ],
    ),
    WBSQuestion(
        key="compliance_kvkk",
        category="Hukuk & KVKK / Regülasyon",
        question="Kişisel verilerin işlenmesi (KVKK) veya mevzuat/uyum kurulu onay süreci gerekiyor mu?",
        description="Aydınlatma metinleri, açık rıza akışları ve hukuk departmanı proje onay maddesi eklenir.",
        icon_type="file-text",
        suggested_tasks=[
            SuggestedTask(
                name="KVKK & Mevzuat Uyum Değerlendirmesi",
                phase="S1",
                description="Toplanan veri türlerinin incelenmesi, aydınlatma metinleri ve veri envanteri kaydı.",
                sorumlu="Hukuk & Uyum Ekibi",
                priority="Yüksek",
                duration=3,
            ),
        ],
    ),
]
