"""Validation shared by single and atomic updates of public site settings."""
import re
from urllib.parse import urlsplit

BOOLS = {'coming_soon', 'sky_animated', 'work_background', 'privacy_approved', 'about_model_animated', 'contact_model_animated', 'case_model_animated', 'about_cat_enabled'}
LINKS = {'social_telegram', 'social_github', 'social_instagram', 'calculator_url'}
PRIVACY = {'privacy_' + key for key in ('operator', 'address', 'hosting', 'recipients', 'retention', 'security')}
EDITABLE = BOOLS | LINKS | PRIVACY | {'contact_email'}


def validate_settings(changes: dict[str, str], current: dict[str, str]) -> dict[str, str]:
    out = {}
    for key, raw in changes.items():
        if key not in EDITABLE:
            raise ValueError(f'Неизвестная настройка: {key}')
        value = raw.strip()
        if len(value) > 10000:
            raise ValueError(f'Слишком длинное значение: {key}')
        if key in BOOLS and value not in {'true', 'false'}:
            raise ValueError(f'{key}: ожидается true или false')
        if key == 'contact_email' and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Укажите корректную почту')
        if key in LINKS:
            internal = key == 'calculator_url' and value.startswith('/') and not value.startswith('//')
            parsed = urlsplit(value)
            absolute = parsed.scheme in {'http', 'https'} and bool(parsed.hostname) and not parsed.username and not parsed.password
            if (value and (any(c.isspace() or ord(c) < 32 for c in value) or '\\' in value or not (internal or absolute))) or (key == 'calculator_url' and not value):
                raise ValueError(f'{key}: используйте http(s)-ссылку' + (' или путь /…' if key == 'calculator_url' else ''))
        out[key] = value
    # A changed document needs a new explicit approval; never inherit an old one.
    if any(key in out and out[key] != current.get(key, '') for key in PRIVACY | {'contact_email'}) and out.get('privacy_approved') != 'true':
        out['privacy_approved'] = 'false'
    merged = {**current, **out}
    if merged.get('privacy_approved') == 'true' and not all(merged.get(key, '').strip() for key in PRIVACY):
        raise ValueError('Перед утверждением заполните все сведения об обработке данных')
    return out
