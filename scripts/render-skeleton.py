#!/usr/bin/env python3
"""Render a Backstage skeleton directory by substituting template variables.

Usage:
    python3 scripts/render-skeleton.py <source-dir> <output-dir> [options]

Options:
    --name NAME               App name (default: testapp)
    --owner OWNER             Owner/org name (default: testowner)
    --description DESCRIPTION App description (default: Test application)
    --dockerhub-org ORG       DockerHub org (default: testorg)
    --frontend FRONTEND       Frontend type (default: react)
    --backend BACKEND         Backend type (default: gofiber)
"""

import argparse
import os
import re
import shutil
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a Backstage skeleton directory."
    )
    parser.add_argument("source_dir", help="Source skeleton directory")
    parser.add_argument("output_dir", help="Output directory")
    parser.add_argument("--name", default="testapp", help="App name")
    parser.add_argument("--owner", default="testowner", help="Owner/org name")
    parser.add_argument(
        "--description", default="Test application", help="App description"
    )
    parser.add_argument("--dockerhub-org", default="testorg", help="DockerHub org")
    parser.add_argument("--frontend", default="react", help="Frontend type")
    parser.add_argument("--backend", default="gofiber", help="Backend type")
    return parser.parse_args()


def build_substitutions(args: argparse.Namespace) -> dict[str, str]:
    return {
        "${{ values.name }}": args.name,
        "${{ values.owner }}": args.owner,
        "${{ values.description }}": args.description,
        "${{ values.dockerhub_org }}": args.dockerhub_org,
        "${{ values.frontend }}": args.frontend,
        "${{ values.backend }}": args.backend,
    }


# Matches {% raw %}, {% endraw %}, {%- raw -%}, {%- endraw -%} and variants.
RAW_TAG_RE = re.compile(r"\{%-?\s*(raw|endraw)\s*-?%\}")


def strip_raw_tags(content: str) -> str:
    """Remove {% raw %} and {% endraw %} tags (and whitespace-trimming variants)."""
    return RAW_TAG_RE.sub("", content)


def substitute_variables(content: str, substitutions: dict[str, str]) -> str:
    for placeholder, value in substitutions.items():
        content = content.replace(placeholder, value)
    return content


def render_file(src_path: str, dst_path: str, substitutions: dict[str, str]) -> None:
    """Read src, apply substitutions and strip raw tags, write to dst."""
    with open(src_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = strip_raw_tags(content)
    content = substitute_variables(content, substitutions)

    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, "w", encoding="utf-8") as f:
        f.write(content)


def render_skeleton(source_dir: str, output_dir: str, substitutions: dict[str, str]) -> None:
    """Walk source_dir, copying files to output_dir with template rendering."""
    source_dir = os.path.abspath(source_dir)
    output_dir = os.path.abspath(output_dir)

    if not os.path.isdir(source_dir):
        print(f"Error: source directory does not exist: {source_dir}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    for root, dirs, files in os.walk(source_dir):
        # Compute relative path from source root
        rel_root = os.path.relpath(root, source_dir)

        for filename in files:
            src_path = os.path.join(root, filename)

            if filename.endswith(".njk"):
                # Strip .njk extension from output filename
                out_filename = filename[:-4]
                is_template = True
            else:
                out_filename = filename
                is_template = False

            if rel_root == ".":
                dst_path = os.path.join(output_dir, out_filename)
            else:
                dst_path = os.path.join(output_dir, rel_root, out_filename)

            os.makedirs(os.path.dirname(dst_path), exist_ok=True)

            if is_template:
                render_file(src_path, dst_path, substitutions)
                print(f"  rendered: {os.path.relpath(dst_path, output_dir)}")
            else:
                shutil.copy2(src_path, dst_path)
                print(f"  copied:   {os.path.relpath(dst_path, output_dir)}")


def main() -> None:
    args = parse_args()
    substitutions = build_substitutions(args)

    print(f"Rendering skeleton: {args.source_dir} -> {args.output_dir}")
    render_skeleton(args.source_dir, args.output_dir, substitutions)
    print("Done.")


if __name__ == "__main__":
    main()
