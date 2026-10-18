"""The greeter — the one agent this lab runs. adk web lists this folder as `agent`.

CHANGE ME (the agent): the name, the model, the instruction file, the tool, and
the one commented-out line chapter II is about.

现状: root_agent is an LlmAgent with an instruction and no tools. Asked for the
door code, it says it cannot look it up.
怎么改: delete the "# " in front of the tools= line, so the call gets the keyword.
改了会怎样: the model gets the function declaration, calls door_code, and the
reply carries the code. scripts/exam.py counts that across three fixed prompts.
"""
from __future__ import annotations

import os

from google.adk.agents import LlmAgent
from google.genai import types

_HERE = os.path.dirname(os.path.abspath(__file__))
INSTRUCTION_FILE = os.path.join(_HERE, "instruction.txt")
MODEL = "gemini-2.5-flash"
DOOR_CODE = "4471"              # the exam checks the reply for this string


def read_instruction() -> str:
    with open(INSTRUCTION_FILE, encoding="utf-8") as f:
        return f.read()


def door_code() -> dict:
    """Look up tonight's door code. Call it whenever someone asks how to get in."""
    return {"code": DOOR_CODE}


root_agent = LlmAgent(
    name="greeter",
    model=MODEL,
    instruction=read_instruction(),
    # tools=[door_code],
    generate_content_config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_budget=0),
        temperature=0.0,
    ),
)
