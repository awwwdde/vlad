"""Run: python -m unittest discover -s back/tests -v (no database required)."""
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from privacy import REQUIRED, privacy_document, consent_error


class PrivacyTests(unittest.TestCase):
    def setUp(self):
        self.settings = {f"privacy_{key}": f"TEST {key}" for key in REQUIRED}
        self.settings["privacy_approved"] = "true"

    def test_collection_closed_without_approval_or_complete_details(self):
        self.assertFalse(privacy_document({})["ready"])
        self.assertTrue(privacy_document(self.settings)["ready"])
        for key in (*REQUIRED, "approved"):
            incomplete = {**self.settings, f"privacy_{key}": " "}
            self.assertFalse(privacy_document(incomplete)["ready"], key)

    def test_every_operator_detail_change_invalidates_previous_consent(self):
        original = privacy_document(self.settings)["version"]
        for key in REQUIRED:
            updated = {**self.settings, f"privacy_{key}": "CHANGED"}
            self.assertNotEqual(original, privacy_document(updated)["version"], key)

    def test_version_deterministic_and_not_affected_by_unrelated_settings(self):
        self.assertEqual(privacy_document(self.settings), privacy_document(dict(reversed(list(self.settings.items())))))
        self.assertEqual(privacy_document(self.settings), privacy_document({**self.settings, "coming_soon": "true"}))

    def test_offline_draft_matches_authoritative_generator(self):
        path = Path(__file__).resolve().parents[2] / "front/src/lib/privacyDraft.json"
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), privacy_document({}))

    def test_server_rejects_unapproved_missing_and_stale_consent(self):
        doc = privacy_document(self.settings)
        self.assertEqual(consent_error(privacy_document({}), True, doc["version"])[0], 503)
        for value, version in ((False, doc["version"]), (True, "old"), ("true", doc["version"]), (True, "")):
            self.assertEqual(consent_error(doc, value, version)[0], 422)
        self.assertIsNone(consent_error(doc, True, doc["version"]))


if __name__ == "__main__":
    unittest.main()
