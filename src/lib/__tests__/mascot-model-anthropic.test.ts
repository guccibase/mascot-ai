import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const anthropicMocks = vi.hoisted(() => {
  const create = vi.fn();
  const finalMessage = vi.fn();
  const stream = vi.fn((request?: unknown, options?: unknown) => {
    void request;
    void options;
    return { finalMessage };
  });
  return { create, finalMessage, stream };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: anthropicMocks.create,
      stream: anthropicMocks.stream,
    };
  },
}));

import { runMascotModel } from "@/lib/mascot-model";

const originalApiKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  anthropicMocks.create.mockReset();
  anthropicMocks.finalMessage.mockReset();
  anthropicMocks.stream.mockClear();
  const message = {
    content: [{ type: "text", text: '{"ok":true}' }],
    stop_reason: "end_turn",
    usage: { input_tokens: 12, output_tokens: 8 },
  };
  anthropicMocks.create.mockResolvedValue(message);
  anthropicMocks.finalMessage.mockResolvedValue(message);
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalApiKey;
});

describe("runMascotModel with Anthropic", () => {
  it("streams long responses and returns the final accumulated message", async () => {
    const signal = new AbortController().signal;
    const result = await runMascotModel({
      model: "claude-sonnet-5",
      instructions: "Refine the mascot.",
      input: "Return the updated mascot JSON.",
      images: [{ mediaType: "image/png", data: "base64-reference" }],
      maxOutputTokens: 32_000,
      reasoningEffort: "low",
      signal,
    });

    expect(anthropicMocks.stream).toHaveBeenCalledOnce();
    expect(anthropicMocks.stream.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        model: "claude-sonnet-5",
        max_tokens: 32_000,
        system: expect.stringContaining(
          "Respond with a single valid JSON object only"
        ),
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: "base64-reference",
                },
              },
              {
                type: "text",
                text: "Return the updated mascot JSON.",
              },
            ],
          },
        ],
      })
    );
    expect(anthropicMocks.stream.mock.calls[0]?.[1]).toEqual({ signal });
    expect(anthropicMocks.create).not.toHaveBeenCalled();
    expect(anthropicMocks.finalMessage).toHaveBeenCalledOnce();
    expect(result).toEqual({
      model: "claude-sonnet-5",
      text: '{"ok":true}',
      usage: { input_tokens: 12, output_tokens: 8 },
    });
  });

  it("keeps short requests on the existing non-streaming path", async () => {
    await runMascotModel({
      model: "claude-sonnet-5",
      instructions: "Create the mascot.",
      input: "Return the mascot JSON.",
      maxOutputTokens: 20_000,
      reasoningEffort: "medium",
    });

    expect(anthropicMocks.create).toHaveBeenCalledOnce();
    expect(anthropicMocks.stream).not.toHaveBeenCalled();
    expect(anthropicMocks.finalMessage).not.toHaveBeenCalled();
  });

  it("rejects a streamed response that exhausted its output budget", async () => {
    anthropicMocks.finalMessage.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"incomplete":' }],
      stop_reason: "max_tokens",
      usage: { input_tokens: 12, output_tokens: 32_000 },
    });

    await expect(
      runMascotModel({
        model: "claude-sonnet-5",
        instructions: "Refine the mascot.",
        input: "Return the updated mascot JSON.",
        maxOutputTokens: 32_000,
        reasoningEffort: "low",
      })
    ).rejects.toMatchObject({
      name: "MascotModelResponseError",
      message: "Claude hit max_tokens (32000) mid-response. Try fewer gestures or regenerate",
      model: "claude-sonnet-5",
      usage: { input_tokens: 12, output_tokens: 32_000 },
    });
  });

  it("rejects every non-terminal stop reason", async () => {
    anthropicMocks.create.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"partial":true}' }],
      stop_reason: "model_context_window_exceeded",
      usage: { input_tokens: 20_000, output_tokens: 8_000 },
    });

    await expect(
      runMascotModel({
        model: "claude-sonnet-5",
        instructions: "Create the mascot.",
        input: "Return the mascot JSON.",
        maxOutputTokens: 20_000,
      })
    ).rejects.toMatchObject({
      name: "MascotModelResponseError",
      message:
        "Claude stopped before completing the response (reason=model_context_window_exceeded)",
      usage: { input_tokens: 20_000, output_tokens: 8_000 },
    });
  });

  it("propagates errors emitted while consuming the provider stream", async () => {
    anthropicMocks.finalMessage.mockRejectedValueOnce(
      new Error("stream connection lost")
    );

    await expect(
      runMascotModel({
        model: "claude-sonnet-5",
        instructions: "Refine the mascot.",
        input: "Return the updated mascot JSON.",
        maxOutputTokens: 32_000,
      })
    ).rejects.toThrow("stream connection lost");
  });
});
