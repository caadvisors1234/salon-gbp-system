from __future__ import annotations

import logging

from app.core.logging import setup_logging


def test_setup_logging_sets_root_level():
    setup_logging("DEBUG", app_env="dev")
    root = logging.getLogger()
    assert root.level == logging.DEBUG
    assert len(root.handlers) >= 1


def test_setup_logging_info_level():
    setup_logging("INFO", app_env="dev")
    root = logging.getLogger()
    assert root.level == logging.INFO


def test_setup_logging_suppresses_noisy_loggers():
    setup_logging("DEBUG", app_env="dev")
    assert logging.getLogger("httpx").level == logging.WARNING
    assert logging.getLogger("celery").level == logging.WARNING
    assert logging.getLogger("sqlalchemy.engine").level == logging.WARNING


def test_setup_logging_json_formatter_in_production():
    setup_logging("INFO", app_env="production")
    root = logging.getLogger()
    handler = root.handlers[0]
    from app.core.logging import JSONFormatter
    assert isinstance(handler.formatter, JSONFormatter)


def test_setup_logging_no_duplicate_handlers():
    setup_logging("INFO", app_env="dev")
    count1 = len(logging.getLogger().handlers)
    setup_logging("INFO", app_env="dev")
    count2 = len(logging.getLogger().handlers)
    assert count2 == count1
