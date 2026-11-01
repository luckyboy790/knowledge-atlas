"""Check the static site's local links and JavaScript syntax without a server."""
import json
import os
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('CODEX_PRIMARY_RUNTIME_NODE', 'node')


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.inline = []
        self.active = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href'):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == 'script':
            self.active = not attrs.get('src') and attrs.get('type', '') not in ('application/json', 'application/ld+json')
            if self.active:
                self.inline.append('')

    def handle_data(self, data):
        if self.active:
            self.inline[-1] += data

    def handle_endtag(self, tag):
        if tag == 'script':
            self.active = False


local_links = 0
inline_scripts = 0
html_files = sorted(ROOT.rglob('*.html'))
for file in html_files:
    page = Page()
    page.feed(file.read_text())
    for link in page.links:
        parts = urlsplit(link)
        if parts.scheme or parts.netloc or not parts.path:
            continue
        relative = unquote(parts.path)
        target = ROOT / relative[1:] if relative.startswith('/') else file.parent / relative
        target = target.resolve()
        assert target.is_relative_to(ROOT), (file, 'link escapes site', link)
        assert target.exists(), (file, 'missing local target', link)
        local_links += 1
    for script in page.inline:
        result = subprocess.run([NODE, '--check', '-'], input=script, text=True, capture_output=True)
        assert result.returncode == 0, (file, result.stderr)
        inline_scripts += 1

js_files = sorted((ROOT / 'assets').glob('*.js')) + sorted((ROOT / 'explore').glob('*.js')) + sorted((ROOT / 'diagnose').glob('*.js'))
for file in js_files:
    result = subprocess.run([NODE, '--check', str(file)], text=True, capture_output=True)
    assert result.returncode == 0, (file, result.stderr)

report = {
    'date': '2026-10-31',
    'result': 'PASS',
    'html_files': len(html_files),
    'local_link_targets_checked': local_links,
    'inline_scripts_checked': inline_scripts,
    'application_scripts_checked': len(js_files),
    'limitations': ['本检查验证本地资源目标与脚本语法，不代替真实浏览器交互和内容审阅。'],
}
(ROOT / 'validation' / 'delivery-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
