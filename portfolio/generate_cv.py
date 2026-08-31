#!/usr/bin/env python3
"""
generate_cv.py — Compiles portfolio/data.yaml into print-ready, ATS-friendly
CV variants using Jinja2.

Usage:
    python generate_cv.py                # full, unfiltered "master" CV
    python generate_cv.py dev             # Software Engineering & Open-Source
    python generate_cv.py data_science    # Machine Learning & Data Science
    python generate_cv.py academic        # Academic & Institutional Leadership

Track ids and output filenames are read from data.yaml's `metadata.cv_focus_tracks`
rather than hardcoded here, so adding a new track only requires editing the data file.

Reads:  portfolio/data.yaml, portfolio/cv_template.html
Writes: portfolio/<cv_file>   (e.g. portfolio/cv_dev.html)
"""

import sys
import pathlib
from datetime import date

import yaml
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

PORTFOLIO_DIR = pathlib.Path(__file__).resolve().parent
DATA_FILE = PORTFOLIO_DIR / "data.yaml"
TEMPLATE_FILE = "cv_template.html"
MASTER_TRACK_ID = "master"


def load_data() -> dict:
    """Read data.yaml securely (yaml.safe_load — never yaml.load/unsafe_load)."""
    if not DATA_FILE.exists():
        raise SystemExit(f"Could not find {DATA_FILE}")
    with DATA_FILE.open("r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f)
        except yaml.YAMLError as exc:
            raise SystemExit(f"data.yaml failed to parse: {exc}")
    if not isinstance(data, dict):
        raise SystemExit("data.yaml did not parse into a mapping — check its structure.")
    return data


def resolve_track(data: dict, track_id: str) -> dict:
    """Look up a focus track's metadata, or synthesize the master track's."""
    tracks = (data.get("metadata") or {}).get("cv_focus_tracks") or []

    if track_id == MASTER_TRACK_ID:
        return {
            "id": MASTER_TRACK_ID,
            "label": "Complete Profile",
            "description": "Full, unfiltered profile across every focus area.",
            "cv_file": (data.get("metadata") or {}).get("master_cv_file", "cv_master.html"),
        }

    for track in tracks:
        if track.get("id") == track_id:
            return track

    known = ", ".join([MASTER_TRACK_ID] + [t.get("id", "?") for t in tracks])
    raise SystemExit(f"Unknown focus track '{track_id}'. Known tracks: {known}")


def filter_by_focus(items: list, track_id: str) -> list:
    """Keep only items tagged with this focus track. The master track keeps everything."""
    if track_id == MASTER_TRACK_ID:
        return items
    return [item for item in items if track_id in (item.get("focus") or [])]


def build_context(data: dict, track: dict) -> dict:
    context = dict(data)  # shallow copy — we only ever replace top-level keys below
    context["experience"] = filter_by_focus(data.get("experience", []), track["id"])
    context["featured_projects"] = filter_by_focus(data.get("featured_projects", []), track["id"])
    context["track"] = track
    context["generated_on"] = date.today().strftime("%B %d, %Y")
    return context


def render_cv(context: dict) -> str:
    env = Environment(
        loader=FileSystemLoader(str(PORTFOLIO_DIR)),
        autoescape=select_autoescape(["html"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    try:
        template = env.get_template(TEMPLATE_FILE)
    except TemplateNotFound:
        raise SystemExit(f"Could not find {PORTFOLIO_DIR / TEMPLATE_FILE}")
    return template.render(**context)


def main() -> None:
    track_id = sys.argv[1] if len(sys.argv) > 1 else MASTER_TRACK_ID

    data = load_data()
    track = resolve_track(data, track_id)
    context = build_context(data, track)

    if track_id != MASTER_TRACK_ID and not context["experience"] and not context["featured_projects"]:
        print(
            f"Warning: nothing in experience/featured_projects is tagged '{track_id}'. "
            f"The compiled CV will still include education, skills, and contact info.",
            file=sys.stderr,
        )

    html = render_cv(context)
    out_path = PORTFOLIO_DIR / track["cv_file"]
    out_path.write_text(html, encoding="utf-8")
    print(f"Compiled {track['label']} → {out_path.relative_to(PORTFOLIO_DIR.parent)}")


if __name__ == "__main__":
    main()
