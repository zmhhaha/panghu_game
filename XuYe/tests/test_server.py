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

    def test_model_config_targets_the_shared_llm_service(self):
        previous = {key: os.environ.get(key) for key in ("LLM_BASE_URL", "LLM_SERVICE_TOKEN", "LLM_MODEL")}
        try:
            os.environ.update({
                "LLM_BASE_URL": "http://llm-service.llm.svc.cluster.local/v1",
                "LLM_SERVICE_TOKEN": "test-token",
                "LLM_MODEL": "deepseek-guarded",
            })
            config = server.model_config()
            self.assertEqual(config["provider"], "llm-service")
            self.assertEqual(config["base_url"], "http://llm-service.llm.svc.cluster.local/v1")
            self.assertEqual(config["model"], "deepseek-guarded")
            self.assertTrue(config["ready"])
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_model_config_is_not_ready_without_the_service_token(self):
        previous = os.environ.get("LLM_SERVICE_TOKEN")
        try:
            os.environ["LLM_BASE_URL"] = "http://llm-service.llm.svc.cluster.local/v1"
            os.environ.pop("LLM_SERVICE_TOKEN", None)
            self.assertFalse(server.model_config()["ready"])
        finally:
            if previous is None:
                os.environ.pop("LLM_SERVICE_TOKEN", None)
            else:
                os.environ["LLM_SERVICE_TOKEN"] = previous

    def test_find_work_reads_the_server_side_catalog(self):
        self.assertIsNone(server.find_work(""))
        self.assertIsNone(server.find_work("not-a-real-work"))
        work = server.find_work("frankenstein")
        self.assertIsNotNone(work)
        self.assertEqual(work["title"], "Frankenstein")

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
        messages = server.build_messages("他推开门。", "门外是三十年前的自己。", "local", server.find_work("journey-west"))
        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("不可撤销的事实", messages[0]["content"])
        self.assertIn("<PLAYER_TEXT>\n门外是三十年前的自己。", messages[1]["content"])

    def test_prompt_takes_the_work_from_the_server_catalog(self):
        messages = server.build_messages(
            "It is a truth.",
            "The letter was forged.",
            "large",
            server.find_work("pride-prejudice"),
        )
        self.assertIn("Pride and Prejudice", messages[0]["content"])
        self.assertIn("Jane Austen", messages[0]["content"])
        self.assertIn("大范围改编", messages[0]["content"])
        self.assertIn("en-US", messages[0]["content"])

    def test_context_is_clipped_from_the_front(self):
        context = "旧" * (server.MAX_CONTEXT_CHARS + 8) + "结尾"
        user_message = server.build_messages(context, "继续", "local", server.find_work("journey-west"))[1]["content"]
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

    def test_stream_parser_ignores_the_usage_only_chunk(self):
        # llm-service 注入了 stream_options.include_usage，最后一帧 choices 是空数组；
        # 直接索引会 IndexError，把已经开始的流打断。
        lines = (
            b'data: {"choices":[{"delta":{"content":"\\u96e8"}}]}\n\n'
            b'data: {"choices":[],"usage":{"prompt_tokens":9,"completion_tokens":1}}\n\n'
            b'data: [DONE]\n\n'
        )
        response = FakeResponse(lines, "text/event-stream")
        self.assertEqual(list(server.stream_openai_response(response)), ["雨"])

    def test_stream_parser_accepts_non_streaming_compatible_server(self):
        body = json.dumps({"choices": [{"message": {"content": "后来，灯灭了。"}}]}).encode()
        response = FakeResponse(body, "application/json")
        self.assertEqual(list(server.stream_openai_response(response)), ["后来，灯灭了。"])


if __name__ == "__main__":
    unittest.main()
