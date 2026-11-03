"""Never let unit tests overwrite a user's models, imports or experiment history."""

import pytest
from aerotwin import config, storage
from aerotwin.api import app as api
from aerotwin.data import store
from aerotwin.ml import engine
from aerotwin.providers import aircraft


@pytest.fixture(scope="session", autouse=True)
def sandbox_data(tmp_path_factory):
    root = tmp_path_factory.mktemp("aerotwin-isolated-state")
    changes = [
        (config, "DATA", root / "data"),
        (config, "MODELS", root / "models"),
        (store, "DATA", root / "data"),
        (api, "DATA", root / "data"),
        (aircraft, "DATA", root / "data"),
        (storage, "DATA", root / "data"),
        (engine, "MODELS", root / "models"),
    ]
    previous = [(module, name, getattr(module, name)) for module, name, value in changes]
    for module, name, value in changes:
        setattr(module, name, value)
    yield root
    for module, name, value in previous:
        setattr(module, name, value)
