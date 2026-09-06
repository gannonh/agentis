import re
from pathlib import Path
from urllib.parse import unquote, urlsplit


root = Path(__file__).resolve().parents[2]
evaluation = root / "docs/research/team-workflow-evaluation-v1.md"
text = evaluation.read_text()
cases = re.split(r"^### TW-(\d{2}) .+$", text, flags=re.MULTILINE)
if cases[1::2] != [f"{number:02}" for number in range(1, 21)]:
    raise SystemExit("Case IDs changed")
for number, body in zip(cases[1::2], cases[2::2]):
    if "Input:" not in body or "Expected:" not in body:
        raise SystemExit(f"TW-{number}: missing rubric")
    if body.count("Verdict: NOT RUN.") != 1:
        raise SystemExit(f"TW-{number}: template verdict changed")

documents = [
    evaluation,
    root / "docs/research/2026-09-06-workflow-research.md",
    root / "docs/project-plan.md",
    root / "docs/verification/README.md",
    root / "docs/adrs/0001-runtime-and-execution-foundations.md",
]
checked = 0
for document in documents:
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", document.read_text()):
        url = urlsplit(target.strip("<>"))
        if url.scheme or url.netloc or not url.path:
            continue
        path = (document.parent / unquote(url.path)).resolve()
        if not path.exists():
            raise SystemExit(f"{document.relative_to(root)}: missing {target}")
        checked += 1

print(f"PASS: 20 fixed unrun cases; {checked} local document links resolve.")
print("This checks document structure only. It executes no workflow or provider test.")
