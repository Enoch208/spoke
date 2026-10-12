#!/usr/bin/env python3
import datetime
import os
from pathlib import Path
import subprocess
import tarfile

os.umask(0o077)
directory = Path("/srv/spoke/backups")
directory.mkdir(mode=0o700, exist_ok=True)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
dump = directory / f"spoke-{stamp}.dump"
temporary = dump.with_suffix(".partial")
try:
    with temporary.open("xb") as output:
        subprocess.run(
            ["docker", "exec", "spoke-db", "pg_dump", "-U", "spoke", "-d", "spoke", "-Fc"],
            stdout=output,
            check=True,
        )
    with temporary.open("rb") as source:
        subprocess.run(
            ["docker", "exec", "-i", "spoke-db", "pg_restore", "--list"],
            stdin=source,
            stdout=subprocess.DEVNULL,
            check=True,
        )
    temporary.replace(dump)
    with tarfile.open(directory / f"spoke-storage-{stamp}.tar.gz", "x:gz") as archive:
        archive.add("/srv/spoke/storage", arcname="storage")
finally:
    temporary.unlink(missing_ok=True)
