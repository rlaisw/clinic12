"""
File Watcher: monitors data/files/ for changes, triggers CocoIndex pipeline.
"""
import os, sys, time, hashlib

sys.path.insert(0, os.path.dirname(__file__))
from cocoindex_pipeline import run_pipeline

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "files")
STATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "coco_state")
os.makedirs(STATE_DIR, exist_ok=True)
STATE_FILE = os.path.join(STATE_DIR, "file_hashes.txt")


def get_file_hash(path: str) -> str:
    return hashlib.md5(open(path, "rb").read()).hexdigest()


def load_state() -> dict:
    state = {}
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            for line in f:
                line = line.strip()
                if "|" in line:
                    path, h = line.rsplit("|", 1)
                    state[path] = h
    return state


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        for path, h in state.items():
            f.write(f"{path}|{h}\n")


def scan_files() -> list[str]:
    files = []
    for root, dirs, fnames in os.walk(DATA_DIR):
        for fname in fnames:
            if fname.startswith("."):
                continue
            files.append(os.path.join(root, fname))
    return files


def watch_and_index(interval: int = 30):
    print(f"Watching {DATA_DIR} for changes (checking every {interval}s)...")
    state = load_state()
    while True:
        files = scan_files()
        changed = False
        for fpath in files:
            h = get_file_hash(fpath)
            if state.get(fpath) != h:
                print(f"[CHANGED] {fpath}")
                state[fpath] = h
                changed = True
        save_state(state)
        if changed:
            print("Re-indexing via CocoIndex pipeline...")
            count = run_pipeline()
            print(f"Indexed {count} records")
        time.sleep(interval)


if __name__ == "__main__":
    watch_and_index()