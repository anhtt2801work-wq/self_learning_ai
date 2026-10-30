#!/usr/bin/env python3
"""Đặt, đổi hoặc tắt mật khẩu của cổng vào website (assets/js/gate-config.js).

    python3 tools/set_password.py               nhập mật khẩu (không hiện khi gõ)
    python3 tools/set_password.py --generate    sinh mật khẩu ngẫu nhiên và in ra MỘT lần
    python3 tools/set_password.py --disable     tắt cổng

Chỉ muối và mã băm PBKDF2-HMAC-SHA256 được ghi ra tệp; mật khẩu thì không. Cổng này chỉ ngăn người vào
tình cờ vì website là các tệp tĩnh công khai (xem ghi chú đầu assets/js/gate.js).
"""
import argparse
import getpass
import hashlib
import secrets
import sys
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent / "assets" / "js" / "gate-config.js"
ITERATIONS = 150_000
ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"        # bỏ các ký tự dễ nhầm: i l o 0 1


def generate() -> str:
    groups = ["".join(secrets.choice(ALPHABET) for _ in range(4)) for _ in range(4)]
    return "-".join(groups)                          # 16 ký tự từ bảng 31 ký tự, khoảng 79 bit


def write(password) -> None:
    if password is None:
        CONFIG.write_text("/* Cổng mật khẩu đang TẮT. Bật bằng: python3 tools/set_password.py */\nwindow.SITE_GATE = null;\n", encoding="utf-8")
        return
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS, 32)
    CONFIG.write_text(
        "/* Sinh bởi tools/set_password.py. Chỉ chứa muối và mã băm, không chứa mật khẩu. */\n"
        f'window.SITE_GATE = {{ salt: "{salt.hex()}", iter: {ITERATIONS}, hash: "{digest.hex()}" }};\n',
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--generate", action="store_true", help="sinh mật khẩu ngẫu nhiên")
    g.add_argument("--disable", action="store_true", help="tắt cổng mật khẩu")
    args = ap.parse_args()
    if args.disable:
        write(None); print("Đã tắt cổng mật khẩu."); return 0
    if args.generate:
        pw = generate()
        write(pw); print("Mật khẩu mới (chỉ hiện lần này, hãy lưu vào trình quản lý mật khẩu):\n\n    " + pw + "\n")
    else:
        pw = getpass.getpass("Mật khẩu mới: ")
        if len(pw) < 8:
            print("Mật khẩu quá ngắn (cần ít nhất 8 ký tự; nên dài hơn).", file=sys.stderr); return 1
        if getpass.getpass("Nhập lại: ") != pw:
            print("Hai lần nhập không khớp.", file=sys.stderr); return 1
        write(pw); print("Đã cập nhật.")
    print(f"Đã ghi {CONFIG.relative_to(CONFIG.parent.parent.parent)}. Hãy commit tệp này để áp dụng trên GitHub Pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
