import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile


def compress_image(image_field, max_width=800, max_height=800, quality=80):
    """Compress and convert an uploaded image to WebP format."""
    if not image_field:
        return image_field

    try:
        img = Image.open(image_field)
    except Exception:
        return image_field

    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
    else:
        img = img.convert('RGB')

    img.thumbnail((max_width, max_height), Image.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format='WEBP', quality=quality, method=4)
    buffer.seek(0)

    original_name = getattr(image_field, 'name', 'image.webp')
    name_without_ext = original_name.rsplit('.', 1)[0] if '.' in original_name else original_name
    new_name = f"{name_without_ext}.webp"

    return InMemoryUploadedFile(
        file=buffer,
        field_name='image',
        name=new_name,
        content_type='image/webp',
        size=buffer.getbuffer().nbytes,
        charset=None,
    )


def compress_existing_file(file_path, max_width=800, max_height=800, quality=80):
    """Compress an existing file on disk to WebP. Returns new path."""
    import os
    try:
        img = Image.open(file_path)
    except Exception:
        return file_path

    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
    else:
        img = img.convert('RGB')

    img.thumbnail((max_width, max_height), Image.LANCZOS)

    name_without_ext = os.path.splitext(file_path)[0]
    new_path = f"{name_without_ext}.webp"

    img.save(new_path, format='WEBP', quality=quality, method=4)

    if new_path != file_path and os.path.exists(file_path):
        os.remove(file_path)

    return new_path
