#!/usr/bin/env python3
"""Rebuild biology/geography in temporary directories; compare without overwriting by default."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = ("biology", "geography")
PARTS = ("topics", "questions", "dependencies", "sources", "coverage")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Explicitly replace only the ten new data files; changed content requires renewed review.")
    parser.add_argument("--report", type=Path, default=ROOT / "validation/biogeo-rebuild.json")
    args = parser.parse_args()
    report = {"checked_date": "2026-11-01", "mode": "write" if args.write else "compare_only", "files": []}
    try:
        pending_writes = []
        with tempfile.TemporaryDirectory(prefix="biogeo-rebuild-") as directory:
            for subject in SUBJECTS:
                author_dir = ROOT / "scripts/curriculum-biogeo" / subject
                build = author_dir / "build.py"
                if not build.is_file():
                    raise FileNotFoundError(str(build))
                out = Path(directory) / subject
                subprocess.run([sys.executable, str(build), "--out", str(out)], cwd=author_dir,
                               env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}, check=True,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                for part in PARTS:
                    name = f"{subject}-{part}.json"
                    rebuilt = out / name
                    current = ROOT / "data" / name
                    new_bytes, old_bytes = rebuilt.read_bytes(), current.read_bytes()
                    json.loads(new_bytes)
                    same = new_bytes == old_bytes
                    report["files"].append({"file": name, "identical_before_write": same,
                        "generated_sha256": hashlib.sha256(new_bytes).hexdigest(),
                        "current_sha256_before_write": hashlib.sha256(old_bytes).hexdigest()})
                    if args.write:
                        pending_writes.append((current, new_bytes, old_bytes))
        report["all_ten_identical"] = len(report["files"]) == 10 and all(row["identical_before_write"] for row in report["files"])
        if not report["all_ten_identical"] and not args.write:
            raise AssertionError("Generated data differ from the reviewed delivery files.")
        # A second-subject build failure must not partially replace the first subject.
        if args.write:
            written = []
            try:
                for current, new_bytes, old_bytes in pending_writes:
                    written.append((current, old_bytes))
                    current.write_bytes(new_bytes)
            except OSError:
                for current, old_bytes in reversed(written):
                    current.write_bytes(old_bytes)
                raise
        report["status"] = "PASS" if report["all_ten_identical"] else "WRITTEN_REVIEW_REQUIRED"
        report["limitations"] = ["Byte reproducibility does not establish factual accuracy.",
            "Changed files invalidate previous content review hashes; rebuild runtime and review the changes before release."]
    except Exception as exc:
        report["status"] = "FAIL"
        report["error"] = str(exc)
        if isinstance(exc, subprocess.CalledProcessError):
            report["build_stderr"] = exc.stderr
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "compared_files": len(report["files"]), "report": str(args.report)}, ensure_ascii=False))
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
