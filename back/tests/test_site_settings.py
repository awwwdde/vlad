from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from site_settings_validation import validate_settings, PRIVACY

class SettingsValidationTests(unittest.TestCase):
    def test_rejects_unsafe_or_invalid_values(self):
        for changes in ({'contact_email': 'wrong'}, {'social_telegram': 'javascript:alert(1)'}, {'calculator_url': '//evil.invalid'}, {'calculator_url': '/\\evil.invalid'}, {'sky_animated': 'yes'}, {'secret_token': 'bad'}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_settings(changes, {})

    def test_changes_revoke_previous_document_approval(self):
        existing = {key: 'existing' for key in PRIVACY} | {'privacy_approved': 'true'}
        self.assertEqual(validate_settings({'privacy_operator': 'changed'}, existing)['privacy_approved'], 'false')
        self.assertEqual(validate_settings({'contact_email': 'new@example.invalid'}, existing)['privacy_approved'], 'false')
        self.assertNotIn('privacy_approved', validate_settings({'sky_animated': 'false'}, existing))

    def test_explicit_approval_requires_complete_document(self):
        with self.assertRaises(ValueError): validate_settings({'privacy_approved': 'true'}, {})
        existing = {key: 'existing' for key in PRIVACY}
        self.assertEqual(validate_settings({'privacy_approved': 'true'}, existing)['privacy_approved'], 'true')
        self.assertEqual(validate_settings({'social_instagram': '', 'calculator_url': '/contact'}, {}), {'social_instagram': '', 'calculator_url': '/contact'})
