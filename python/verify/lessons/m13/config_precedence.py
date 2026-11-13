"""Settings come from four places. The one nearest to the person who runs the job wins, and every value remembers where it came from."""
import tomllib

DEFAULTS = {"api_url": "https://api.brewline.example/orders", "batch_size": 1000, "dry_run": False}
SECRET = "BREWLINE_API_TOKEN"  # a secret is read from the environment only, and never printed


def as_type(default, value):
    if isinstance(default, bool):
        return value if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes")
    return type(default)(value)


def load_config(file_text=None, env=None, args=None):
    """Layers, from weakest to strongest: defaults, a TOML file, BREWLINE_* environment variables, command line flags."""
    config = {key: (value, "default") for key, value in DEFAULTS.items()}
    layers = []
    if file_text:
        layers.append(("config file", tomllib.loads(file_text)))
    if env:
        layers.append(("environment", {k.removeprefix("BREWLINE_").lower(): v for k, v in env.items() if k.startswith("BREWLINE_") and k != SECRET}))
    if args:
        layers.append(("command line", args))
    for name, values in layers:
        for key, value in values.items():
            if key not in DEFAULTS:
                raise KeyError(f"unknown setting {key!r} in the {name}")
            config[key] = (as_type(DEFAULTS[key], value), name)
    return config


def api_token(env):
    token = env.get(SECRET)
    if not token:
        raise SystemExit(f"{SECRET} is not set. Export it, or run with --dry-run.")
    return token


FILE = 'api_url = "https://staging.brewline.example/orders"\nbatch_size = 500\n'
ENV = {"BREWLINE_BATCH_SIZE": "200", "BREWLINE_API_TOKEN": "s3cr3t-token-value"}
ARGS = {"batch_size": 50, "dry_run": True}


def show(title, config):
    print(title)
    for key, (value, source) in config.items():
        print(f"  {key:<11}{value!s:<42}from the {source}")


show("defaults only:", load_config())
show("with a config file:", load_config(FILE))
show("and an environment variable:", load_config(FILE, ENV))
show("and command line flags:", load_config(FILE, ENV, ARGS))

print("a setting that does not exist:")
try:
    load_config(FILE, args={"batchsize": 5})
except KeyError as err:
    print("  KeyError:", err)
print("the token is read from the environment:", len(api_token(ENV)), "characters, never printed")
try:
    api_token({})
except SystemExit as err:
    print("without it:", err)
