#!/usr/bin/env python3
"""Static checks for the site: broken local links, duplicate ids, unknown visualizations.

    python3 tools/check_site.py
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent


class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.dupes, self.refs, self.viz = set(), [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            if a["id"] in self.ids:
                self.dupes.append(a["id"])
            self.ids.add(a["id"])
        for key in ("href", "src"):
            if a.get(key):
                self.refs.append(a[key])
        if a.get("data-viz"):
            self.viz.append(a["data-viz"])


def main() -> int:
    errors = []
    pages = sorted(ROOT.glob("*.html"))
    scans = {}
    for page in pages:
        s = Scan()
        s.feed(page.read_text(encoding="utf-8"))
        scans[page.name] = s

    registered = set()
    for js in (ROOT / "assets" / "js").glob("*.js"):
        registered.update(re.findall(r"Viz\.register\('([\w-]+)'", js.read_text(encoding="utf-8")))

    # Mọi trang phải nạp cổng mật khẩu (trừ khi bạn chủ động bỏ trang khỏi cổng ở đây).
    for page in pages:
        text = page.read_text(encoding="utf-8")
        if "assets/js/gate-config.js" not in text or "assets/js/gate.js" not in text:
            errors.append(f"{page.name}: thiếu thẻ script gate-config.js / gate.js trong <head>")
        elif text.index("assets/js/gate.js") > text.find("</head>"):
            errors.append(f"{page.name}: gate.js phải nằm trong <head> (chạy trước khi trang hiện ra)")

    for name, s in scans.items():
        for d in s.dupes:
            errors.append(f"{name}: duplicate id '{d}'")
        for v in s.viz:
            if v not in registered:
                errors.append(f"{name}: data-viz '{v}' has no Viz.register")
        for ref in s.refs:
            u = urlparse(ref)
            if u.scheme in ("http", "https", "mailto", "data") or ref.startswith("#") and not ref[1:]:
                continue
            if ref.startswith("#"):
                if unquote(ref[1:]) not in s.ids:
                    errors.append(f"{name}: dangling in-page link {ref}")
                continue
            target = (ROOT / unquote(u.path)).resolve()
            if not target.exists():
                errors.append(f"{name}: missing file for {ref}")
            elif u.fragment and target.suffix == ".html":
                other = scans.get(target.name)
                if other is None or unquote(u.fragment) not in other.ids:
                    errors.append(f"{name}: missing anchor in {ref}")

    for e in errors:
        print("ERROR", e)
    print(f"checked {len(pages)} pages, {len(registered)} visualizations: {'OK' if not errors else str(len(errors)) + ' problem(s)'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
