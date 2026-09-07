"""Хранение загруженных изображений портфолио.

Файлы лежат на диске в томе, а не в БД: картинки на 300 КБ в Postgres раздувают
дампы и заставляют гонять их через SQL на каждый показ. В базе остаются только
имена файлов.

Каждая загрузка проходит через Pillow, а не сохраняется как пришла. Причин три:

  * это проверка. Расширение и заголовок Content-Type подделываются тривиально,
    а изображение, которое Pillow не смог открыть, изображением не является;
  * это ограничение размера. Снимок с телефона на 12 МБ и 4000px в поперечнике
    на карточке проекта не нужен никому, а грузиться будет секунды;
  * это очистка. EXIF снимка содержит модель камеры и нередко координаты
    съёмки - выкладывать их в открытый доступ вместе с картинкой не нужно.
"""
from __future__ import annotations

import io
import secrets
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from config import settings

#: Больше пяти на проект не нужно: карусель длиннее никто не долистывает.
MAX_IMAGES_PER_ITEM = 5

#: Предел на приём. Всё, что больше, почти наверняка ошибка выбора файла.
MAX_UPLOAD_BYTES = 12 * 1024 * 1024

#: Длинная сторона после уменьшения. 1920 хватает и ретине на всю ширину
#: карточки, и полноэкранному просмотру.
MAX_SIDE = 1920

#: Качество JPEG. На 82 артефакты не видны, а вес втрое меньше исходного.
JPEG_QUALITY = 82

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}


class UploadError(ValueError):
    """Понятная человеку причина отказа."""


def uploads_dir() -> Path:
    d = Path(settings.uploads_dir).resolve()
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_image(raw: bytes, slug: str) -> str:
    """Сохранить картинку и вернуть её имя файла.

    Имя случайное, а не исходное: два человека загрузят `photo.jpg`, и второй
    затрёт первого. Плюс исходное имя - это лишние данные о чужой файловой
    системе в публичном URL.
    """
    if len(raw) > MAX_UPLOAD_BYTES:
        raise UploadError(
            f"файл больше {MAX_UPLOAD_BYTES // 1024 // 1024} МБ"
        )
    if not raw:
        raise UploadError("пустой файл")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise UploadError("это не изображение или файл повреждён") from exc

    if img.format not in ALLOWED_FORMATS:
        raise UploadError(f"формат {img.format or '?'} не поддерживается")

    # Поворот по EXIF до того, как EXIF будет отброшен: иначе вертикальные
    # снимки с телефона лягут набок.
    img = _apply_exif_rotation(img)

    if img.mode not in ("RGB", "L"):
        # Прозрачность кладём на белый: JPEG альфу не хранит, а без подложки
        # прозрачные области станут чёрными.
        img = _flatten(img)

    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)

    name = f"{slug}-{secrets.token_hex(8)}.jpg"
    # save() принимает только пиксели: EXIF, ICC и прочие блоки не переносятся.
    img.save(uploads_dir() / name, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return name


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    try:
        from PIL import ImageOps

        return ImageOps.exif_transpose(img) or img
    except Exception:  # noqa: BLE001
        return img


def _flatten(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA", "P"):
        rgba = img.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, (255, 255, 255))
        canvas.paste(rgba, mask=rgba.split()[-1])
        return canvas
    return img.convert("RGB")


def delete_image(name: str) -> None:
    """Удалить файл. Отсутствие файла ошибкой не считаем: запись в БД всё
    равно должна уйти, иначе карточка застрянет со ссылкой в никуда."""
    path = _safe_path(name)
    if path is not None:
        path.unlink(missing_ok=True)


def _safe_path(name: str) -> Path | None:
    """Путь внутри каталога загрузок или None.

    Имя приходит из БД, но проверка всё равно нужна: подстановка `../` в имя
    превратила бы удаление картинки в удаление произвольного файла.
    """
    base = uploads_dir()
    candidate = (base / name).resolve()
    if candidate.parent != base:
        return None
    return candidate


def public_url(name: str) -> str:
    """URL, по которому картинка отдаётся сайту."""
    return f"/uploads/{name}"
