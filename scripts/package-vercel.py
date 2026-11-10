"""Create a Vercel Drop ZIP from the current public files."""
from pathlib import Path
import json
import zipfile

app = Path(__file__).resolve().parents[1]
public = app / 'public'
archive = app.parent / 'Nơi Ánh Trăng Rơi - Vercel.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for path in sorted(public.rglob('*')):
        if path.is_file():
            z.write(path, path.relative_to(public))
    config = json.loads((app / 'vercel.json').read_text(encoding='utf-8'))
    config.pop('outputDirectory', None)
    z.writestr('vercel.json', json.dumps(config, ensure_ascii=False, indent=2))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'index.html' in z.namelist()
    print(f'Verified Vercel ZIP: {len(z.namelist())} files')
