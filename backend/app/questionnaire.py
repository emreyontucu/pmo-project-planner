from typing import List, TypedDict


class ExtraQuestion(TypedDict):
    key: str
    text: str


# Static rule-based question set for topics the Excel template has no column for.
# Not project-type-branched yet — every project gets the same set. If/when project
# types are introduced, filter this list by project.type instead of redesigning it.
EXTRA_QUESTIONS: List[ExtraQuestion] = [
    {"key": "penetration_test", "text": "Bu projede penetrasyon testi planlanıyor mu?"},
    {"key": "load_test", "text": "Yük testi yapılacak mı?"},
    {"key": "test_automation", "text": "Test otomasyonu gerekli mi?"},
]

ANSWER_CHOICES = {"Evet", "Hayır", "Opsiyonel"}
