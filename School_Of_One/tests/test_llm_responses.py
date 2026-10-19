import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from openai import OpenAI


class JudgeResponsesTests(unittest.TestCase):
    def load_judge(self, name):
        path = Path(__file__).parents[1] / 'apps' / 'agents' / name / 'judge' / 'llm.py'
        spec = importlib.util.spec_from_file_location(name.replace('-', '_')+'_llm', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.MAX_RETRIES = 0
        return module

    def test_all_judges_send_responses_and_read_sdk_output_text(self):
        for name in ('duel-judge', 'combo-judge', 'training-ground'):
            with self.subTest(judge=name):
                requests = []
                def handler(request):
                    requests.append(request)
                    return httpx.Response(200, json={'id': 'resp_test', 'object': 'response',
                        'created_at': 123, 'model': 'upstream-model', 'status': 'completed',
                        'output': [{'type': 'reasoning', 'id': 'rs_1', 'summary': []},
                                   {'type': 'message', 'id': 'msg_1', 'role': 'assistant',
                                    'status': 'completed', 'content': [
                                        {'type': 'output_text', 'text': 'judge result', 'annotations': []}]}]})
                module = self.load_judge(name)
                with OpenAI(api_key='test-token', base_url='http://llm.test/v1',
                            http_client=httpx.Client(transport=httpx.MockTransport(handler))) as client:
                    module._client = client
                    with patch.dict(os.environ, {'LLM_MODEL': 'llm-guarded'}):
                        self.assertEqual(module.call_llm('system', 'question'), 'judge result')
                self.assertEqual(requests[0].url.path, '/v1/responses')
                body = json.loads(requests[0].content)
                self.assertEqual((body['instructions'], body['input']), ('system', 'question'))
                self.assertFalse(body['store'])
                self.assertNotIn('messages', body)

    def test_incomplete_response_is_a_failure(self):
        module = self.load_judge('duel-judge')
        def handler(_):
            return httpx.Response(200, json={'id': 'resp_test', 'object': 'response',
                'created_at': 123, 'model': 'upstream-model', 'status': 'incomplete', 'output': []})
        with OpenAI(api_key='test-token', base_url='http://llm.test/v1',
                    http_client=httpx.Client(transport=httpx.MockTransport(handler))) as client:
            module._client = client
            with self.assertRaises(RuntimeError):
                module.call_llm('system', 'question')

    def test_all_judges_reject_refusal_even_when_sdk_output_text_is_nonempty(self):
        for name in ('duel-judge', 'combo-judge', 'training-ground'):
            with self.subTest(judge=name):
                module = self.load_judge(name)
                def handler(_):
                    return httpx.Response(200, json={'id': 'resp_test', 'object': 'response',
                        'created_at': 123, 'model': 'upstream-model', 'status': 'completed',
                        'output': [{'type': 'message', 'id': 'msg_1', 'role': 'assistant',
                            'status': 'completed', 'content': [
                                {'type': 'output_text', 'text': 'partial result', 'annotations': []},
                                {'type': 'refusal', 'refusal': 'Unavailable'}]}]})
                with OpenAI(api_key='test-token', base_url='http://llm.test/v1',
                            http_client=httpx.Client(transport=httpx.MockTransport(handler))) as client:
                    module._client = client
                    with self.assertRaisesRegex(RuntimeError, 'contains a refusal'):
                        module.call_llm('system', 'question')
