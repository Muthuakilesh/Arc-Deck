from datetime import datetime, timezone


def _stamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def error_response(message, status=400, code="ERR_BAD_REQUEST", details=None):
    body = {
        "success": False,
        "error": str(message),
        "code": str(code),
        "timestamp": _stamp()
    }

    if details is not None:
        body["details"] = details

    return body, int(status)


def envelope(result, default_code="ERR_REQUEST_FAILED"):
    body, status = result if isinstance(result, tuple) else (result, 200)

    if isinstance(body, dict) and "error" in body:
        code = body.get("code") or default_code
        details = body.get("details")
        return error_response(body.get("error"), status=status, code=code, details=details)

    return body, status
