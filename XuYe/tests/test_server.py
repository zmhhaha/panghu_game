import io
import json
import os
import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import server


class FakeResponse:
    def __init__(self, body: bytes, content_type: str):
        self._body = body
        self.headers = {"Content-Type": content_type}

    def __iter__(self):
        return iter(self._body.splitlines(keepends=True))

    def read(self):
        return self._body


class ServerTests(unittest.TestCase):
    def test_works_catalog_contains_translated_foreign_works(self):
        works = server.load_works()
        ids = {work["id"] for work in works}
        self.assertGreaterEqual(len(works), 7)
        self.assertTrue({"pride-prejudice", "pride-prejudice-zh", "frankenstein", "frankenstein-zh"} <= ids)

    def test_provider_selects_the_matching_environment_fields(self):
        previous = {key: os.environ.get(key) for key in ("PROVIDER", "DEEPSEEK_BASE_URL", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL")}
        try:
            os.environ.update({
                "PROVIDER": "deepseek",
                "DEEPSEEK_BASE_URL": "https://example.test/v1",
                "DEEPSEEK_API_KEY": "test-key",
                "DEEPSEEK_MODEL": "test-model",
            })
            config = server.model_config()
            self.assertEqual(config["provider"], "deepseek")
            self.assertEqual(config["base_url"], "https://example.test/v1")
            self.assertEqual(config["model"], "test-model")
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_chat_url_accepts_base_or_full_endpoint(self):
        self.assertEqual(
            server.chat_completions_url("https://example.com/v1/"),
            "https://example.com/v1/chat/completions",
        )
        self.assertEqual(
            server.chat_completions_url("https://example.com/v1/chat/completions"),
            "https://example.com/v1/chat/completions",
        )

    def test_prompt_marks_player_text_as_canonical_fiction(self):
        messages = server.build_messages("他推开门。", "门外是三十年前的自己。")
        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("不可撤销的事实", messages[0]["content"])
        self.assertIn("<PLAYER_TEXT>\n门外是三十年前的自己。", messages[1]["content"])

    def test_prompt_includes_selected_work_and_scope(self):
        messages = server.build_messages(
            "It is a truth.",
            "The letter was forged.",
            scope="large",
            work_title="Pride and Prejudice",
            work_author="Jane Austen",
            language="en-US",
        )
        self.assertIn("Pride and Prejudice", messages[0]["content"])
        self.assertIn("大范围改编", messages[0]["content"])
        self.assertIn("en-US", messages[0]["content"])

    def test_context_is_clipped_from_the_front(self):
        context = "旧" * (server.MAX_CONTEXT_CHARS + 8) + "结尾"
        user_message = server.build_messages(context, "继续")[1]["content"]
        self.assertNotIn("旧" * (server.MAX_CONTEXT_CHARS + 1), user_message)
        self.assertIn("结尾", user_message)

    def test_stream_parser_reads_openai_sse(self):
        lines = (
            b'data: {"choices":[{"delta":{"content":"\\u96e8"}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"\\u505c\\u4e86"}}]}\n\n'
            b'data: [DONE]\n\n'
        )
        response = FakeResponse(lines, "text/event-stream")
        self.assertEqual(list(server.stream_openai_response(response)), ["雨", "停了"])

    def test_stream_parser_accepts_non_streaming_compatible_server(self):
        body = json.dumps({"choices": [{"message": {"content": "后来，灯灭了。"}}]}).encode()
        response = FakeResponse(body, "application/json")
        self.assertEqual(list(server.stream_openai_response(response)), ["后来，灯灭了。"])


if __name__ == "__main__":
    unittest.main()
