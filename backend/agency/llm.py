"""Model client. One shape in, one shape out.

The agent loop only ever calls:

    client.messages.create(model=..., max_tokens=..., system=..., messages=[...], tools=[...])

and reads Anthropic-shaped content blocks back. Anthropic is the default and
needs no translation. OpenAI and xAI go through a thin adapter below that speaks
the same shape, so `runtime.py` never learns which provider it is talking to.

Provider is picked by whichever key is set, or forced with AGENT_PROVIDER:

    export ANTHROPIC_API_KEY=sk-ant-...     # default
    export OPENAI_API_KEY=sk-...            # AGENT_PROVIDER=openai
    export XAI_API_KEY=xai-...              # AGENT_PROVIDER=xai

Override the model with AGENT_MODEL. The client is built lazily, so importing
this module without a key is fine — the error arrives when you start a run, not
when the server boots.
"""
from __future__ import annotations

import json
import os

PROVIDERS = ("anthropic", "openai", "xai")

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5",
    "openai": "gpt-5.5",
    "xai": "grok-4.5",
}

# USD per million tokens. Used for the cost line in the run log and the UI.
PRICES = {
    "claude-opus-5":    (5.0, 25.0),
    "claude-sonnet-5":  (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
}
DEFAULT_PRICE = (3.0, 15.0)

BASE_URLS = {"xai": "https://api.x.ai/v1"}

KEY_VARS = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "xai": "XAI_API_KEY",
}


def _detect_provider() -> str:
    forced = os.environ.get("AGENT_PROVIDER", "").strip().lower()
    if forced:
        if forced not in PROVIDERS:
            raise RuntimeError(f"AGENT_PROVIDER must be one of {PROVIDERS}, got {forced!r}")
        return forced
    for name in PROVIDERS:
        if os.environ.get(KEY_VARS[name]):
            return name
    return "anthropic"  # no key anywhere; fail later with a useful message


PROVIDER = _detect_provider()
MODEL = os.environ.get("AGENT_MODEL") or DEFAULT_MODELS[PROVIDER]


def price_per_million(model: str = MODEL) -> tuple[float, float]:
    return PRICES.get(model, DEFAULT_PRICE)


class MissingAPIKey(RuntimeError):
    pass


# --- OpenAI / xAI adapter ---------------------------------------------------
# Anthropic-shaped blocks over an OpenAI chat completion.

class _Block:
    def __init__(self, type, text=None, id=None, name=None, input=None):
        self.type, self.text, self.id, self.name, self.input = type, text, id, name, input


class _Usage:
    def __init__(self, i, o):
        self.input_tokens, self.output_tokens = i, o


class _Resp:
    def __init__(self, content, usage):
        self.content, self.usage = content, usage


def _to_openai_messages(system, messages):
    out = [{"role": "system", "content": system}]
    for m in messages:
        content = m["content"]
        if m["role"] == "user":
            if isinstance(content, str):
                out.append({"role": "user", "content": content})
            else:
                for blk in content:
                    out.append({"role": "tool",
                                "tool_call_id": blk["tool_use_id"],
                                "content": str(blk["content"])})
        else:
            text = "".join(b.text or "" for b in content if b.type == "text")
            calls = [{"id": b.id, "type": "function",
                      "function": {"name": b.name, "arguments": json.dumps(b.input)}}
                     for b in content if b.type == "tool_use"]
            msg = {"role": "assistant", "content": text or None}
            if calls:
                msg["tool_calls"] = calls
            out.append(msg)
    return out


class _OpenAIMessages:
    def __init__(self, client):
        self._c = client

    def create(self, model=None, max_tokens=4000, system="", messages=None, tools=None):
        payload = _to_openai_messages(system, messages or [])
        kwargs = {"model": model or MODEL, "messages": payload}
        if tools:
            kwargs["tools"] = [{"type": "function", "function": {
                "name": t["name"], "description": t["description"],
                "parameters": t["input_schema"]}} for t in tools]

        try:
            r = self._c.chat.completions.create(max_completion_tokens=max_tokens, **kwargs)
        except Exception as e:
            if "max_completion_tokens" not in str(e):
                raise
            r = self._c.chat.completions.create(max_tokens=max_tokens, **kwargs)

        msg = r.choices[0].message
        blocks = []
        if msg.content:
            blocks.append(_Block("text", text=msg.content))
        for tc in (msg.tool_calls or []):
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            blocks.append(_Block("tool_use", id=tc.id, name=tc.function.name, input=args))

        u = r.usage
        return _Resp(blocks, _Usage(getattr(u, "prompt_tokens", 0), getattr(u, "completion_tokens", 0)))


class _OpenAIClient:
    def __init__(self, provider: str):
        try:
            from openai import OpenAI
        except ImportError as e:  # noqa: TRY003 - the fix is one command, say it
            raise MissingAPIKey(
                f"provider {provider} needs the openai package: pip install openai"
            ) from e
        self.messages = _OpenAIMessages(
            OpenAI(api_key=os.environ[KEY_VARS[provider]], base_url=BASE_URLS.get(provider))
        )


def _build():
    key = os.environ.get(KEY_VARS[PROVIDER])
    if not key:
        raise MissingAPIKey(
            f"no API key for provider {PROVIDER!r}. "
            f"Set {KEY_VARS[PROVIDER]}, or pick another provider with AGENT_PROVIDER."
        )
    if PROVIDER == "anthropic":
        try:
            import anthropic
        except ImportError as e:
            raise MissingAPIKey("pip install anthropic") from e
        print(f"provider: anthropic  model: {MODEL}")
        return anthropic.Anthropic(api_key=key)
    print(f"provider: {PROVIDER}  model: {MODEL}")
    return _OpenAIClient(PROVIDER)


class _LazyClient:
    """Builds the real client on first use, so import never needs a key."""

    def __init__(self):
        self._impl = None

    @property
    def messages(self):
        if self._impl is None:
            self._impl = _build()
        return self._impl.messages


client = _LazyClient()
