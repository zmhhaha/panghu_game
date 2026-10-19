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
                "LLM_MODEL": "custom-guarded",
            })
            config = server.model_config()
            self.assertEqual(config["provider"], "llm-service")
            self.assertEqual(config["base_url"], "http://llm-service.llm.svc.cluster.local/v1")
            self.assertEqual(config["model"], "custom-guarded")
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

    def test_max_tokens_defaults_to_unset(self):
        previous = os.environ.get("LLM_MAX_TOKENS")
        try:
            os.environ.pop("LLM_MAX_TOKENS", None)
            self.assertIsNone(server.model_config()["max_tokens"])
            os.environ["LLM_MAX_TOKENS"] = "2048"
            self.assertEqual(server.model_config()["max_tokens"], 2048)
        finally:
            if previous is None:
                os.environ.pop("LLM_MAX_TOKENS", None)
            else:
                os.environ["LLM_MAX_TOKENS"] = previous

    def test_upstream_request_omits_max_tokens_when_unset(self):
        # 上游是推理模型：卡住 max_tokens 会让思考吃光预算、正文为空。
        previous = {key: os.environ.get(key) for key in ("LLM_BASE_URL", "LLM_SERVICE_TOKEN", "LLM_MAX_TOKENS")}
        try:
            os.environ.update({"LLM_BASE_URL": "http://llm.test/v1", "LLM_SERVICE_TOKEN": "test-token"})
            work = server.find_work("journey-west")

            os.environ.pop("LLM_MAX_TOKENS", None)
            body = json.loads(server.build_upstream_request("上一段。", "续写。", "local", work).data)
            self.assertNotIn("max_output_tokens", body)
            self.assertIn("input", body)
            self.assertFalse(body["store"])
            self.assertTrue(body["stream"])

            os.environ["LLM_MAX_TOKENS"] = "2048"
            body = json.loads(server.build_upstream_request("上一段。", "续写。", "local", work).data)
            self.assertEqual(body["max_output_tokens"], 2048)
        finally:
            for key, value in previous.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_find_work_reads_the_server_side_catalog(self):
        self.assertIsNone(server.find_work(""))
        self.assertIsNone(server.find_work("not-a-real-work"))
        work = server.find_work("frankenstein")
        self.assertIsNotNone(work)
        self.assertEqual(work["title"], "Frankenstein")

    def test_responses_url_accepts_base_or_full_endpoint(self):
        self.assertEqual(
            server.responses_url("https://example.com/v1/"),
            "https://example.com/v1/responses",
        )
        self.assertEqual(
            server.responses_url("https://example.com/v1/responses"),
            "https://example.com/v1/responses",
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

    def test_stream_parser_reads_responses_and_ignores_reasoning(self):
        final = {"status": "completed", "output": [
            {"type": "reasoning", "summary": []},
            {"type": "message", "content": [{"type": "output_text", "text": "雨停了"}]},
        ]}
        events = [
            {"type": "response.reasoning_summary_text.delta", "delta": "思考"},
            {"type": "response.output_text.delta", "delta": "雨"},
            {"type": "response.output_text.delta", "delta": "停了"},
            {"type": "response.completed", "response": final},
        ]
        body = "".join("data: " + json.dumps(event) + "\n\n" for event in events).encode()
        self.assertEqual(list(server.stream_responses(FakeResponse(body, "text/event-stream"))), ["雨", "停了"])

    def test_stream_parser_rejects_truncation_and_failure(self):
        for event in ({"type": "response.output_text.delta", "delta": "partial"},
                      {"type": "error", "message": "failure"}):
            body = ("data: " + json.dumps(event) + "\n\n").encode()
            with self.subTest(event=event), self.assertRaises(RuntimeError):
                list(server.stream_responses(FakeResponse(body, "text/event-stream")))

    def test_stream_parser_fills_terminal_text_without_duplicate(self):
        events = [{"type": "response.output_text.delta", "delta": "雨"},
                  {"type": "response.completed", "response": {"status": "completed", "output": [
                      {"type": "message", "content": [{"type": "output_text", "text": "雨停了"}]}]}}]
        body = "".join("data: " + json.dumps(event) + "\n\n" for event in events).encode()
        self.assertEqual(list(server.stream_responses(FakeResponse(body, "text/event-stream"))), ["雨", "停了"])

    def test_stream_parser_accepts_non_streaming_responses(self):
        body = json.dumps({"status": "completed", "output": [
            {"type": "message", "content": [{"type": "output_text", "text": "后来，灯灭了。"}]}]}).encode()
        self.assertEqual(list(server.stream_responses(FakeResponse(body, "application/json"))), ["后来，灯灭了。"])

    def test_mixed_text_and_refusal_is_not_success_for_json_or_terminal_stream(self):
        final = {"status": "completed", "output": [
            {"type": "message", "content": [
                {"type": "output_text", "text": "partial"},
                {"type": "refusal", "refusal": "Unavailable"},
            ]},
        ]}
        bodies = (
            (json.dumps(final).encode(), "application/json"),
            (("data: " + json.dumps({"type": "response.completed", "response": final}) + "\n\n").encode(),
             "text/event-stream"),
        )
        for body, content_type in bodies:
            with self.subTest(content_type=content_type), self.assertRaisesRegex(RuntimeError, "拒绝"):
                list(server.stream_responses(FakeResponse(body, content_type)))

    def test_refusal_event_after_text_fails_before_completion(self):
        for kind in ("response.refusal.delta", "response.refusal.done"):
            events = [
                {"type": "response.output_text.delta", "delta": "partial"},
                {"type": kind, "delta": "Unavailable", "refusal": "Unavailable"},
                {"type": "response.completed", "response": {"status": "completed", "output": [
                    {"type": "message", "content": [{"type": "output_text", "text": "partial"}]},
                ]}},
            ]
            body = "".join("data: " + json.dumps(event) + "\n\n" for event in events).encode()
            with self.subTest(kind=kind):
                stream = server.stream_responses(FakeResponse(body, "text/event-stream"))
                self.assertEqual(next(stream), "partial")
                with self.assertRaisesRegex(RuntimeError, "拒绝"):
                    next(stream)


if __name__ == "__main__":
    unittest.main()
