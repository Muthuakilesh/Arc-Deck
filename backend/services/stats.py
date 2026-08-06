import os
import socket
import time

import psutil


ROOT_PATH = os.environ.get("SystemDrive", "") + os.sep if os.name == "nt" else "/"

# Prime psutil so cpu_percent can be read without blocking the request thread.
psutil.cpu_percent(interval=None)


def _get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # connect to a public DNS server (no data is actually sent)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def get_system_stats():
    cpu = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(ROOT_PATH)
    uptime = time.time() - psutil.boot_time()

    gpus = []
    try:
        import GPUtil
        gpu_list = GPUtil.getGPUs()
        for g in gpu_list:
            gpus.append({
                "id": g.id,
                "name": g.name,
                "load": round(g.load * 100, 1),
                "memoryTotal": g.memoryTotal,
                "memoryUsed": g.memoryUsed,
                "temperature": getattr(g, "temperature", None)
            })
    except Exception:
        gpus = []

    return {
        "cpu": cpu,
        "ram": memory.percent,
        "disk": round(disk.percent, 1),
        "uptime": int(uptime),
        "ip": _get_local_ip(),
        "gpus": gpus
    }