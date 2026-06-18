// Curated list of Featherless AI models available for chat
// Fetched from: https://api.featherless.ai/v1/models

export interface ChatModel {
  id: string;
  name: string;
  provider: string;
  context: number;
  cost: number;
  toolUse: boolean;
  description: string;
}

export const MODELS: ChatModel[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "OpenAI",
    context: 131072,
    cost: 2,
    toolUse: true,
    description: "Best overall — 131k context, balanced speed & quality"
  },
  {
    id: "deepseek-ai/DeepSeek-V4-Pro",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    context: 262144,
    cost: 4,
    toolUse: true,
    description: "Top-tier reasoning, 262k context"
  },
  {
    id: "deepseek-ai/DeepSeek-V4-Flash",
    name: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    context: 262144,
    cost: 4,
    toolUse: true,
    description: "Faster DeepSeek, 262k context"
  },
  {
    id: "deepseek-ai/DeepSeek-V3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    context: 131072,
    cost: 4,
    toolUse: true,
    description: "Excellent all-rounder, 131k context"
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1",
    name: "DeepSeek V3.1",
    provider: "DeepSeek",
    context: 131072,
    cost: 4,
    toolUse: true,
    description: "V3.1 variant, 131k context"
  },
  {
    id: "Qwen/QwQ-32B",
    name: "QwQ 32B",
    provider: "Qwen",
    context: 32768,
    cost: 2,
    toolUse: true,
    description: "Reasoning specialist (thinking model)"
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
    name: "Qwen3 235B Thinking",
    provider: "Qwen",
    context: 32768,
    cost: 4,
    toolUse: true,
    description: "MoE thinking model (22B active)"
  },
  {
    id: "moonshotai/Kimi-K2-Instruct",
    name: "Kimi K2",
    provider: "Moonshot AI",
    context: 32768,
    cost: 4,
    toolUse: true,
    description: "Very capable general model"
  },
  {
    id: "google/gemma-3-27b-it",
    name: "Gemma 3 27B",
    provider: "Google",
    context: 32768,
    cost: 2,
    toolUse: false,
    description: "Fast & capable, good balance"
  },
  {
    id: "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    name: "Mistral Small 24B",
    provider: "Mistral",
    context: 32768,
    cost: 2,
    toolUse: true,
    description: "Solid compact model"
  },
  {
    id: "microsoft/phi-4",
    name: "Phi-4",
    provider: "Microsoft",
    context: 32768,
    cost: 1,
    toolUse: false,
    description: "Small but surprisingly smart"
  },
  {
    id: "NousResearch/Hermes-4-14B",
    name: "Hermes 4 14B",
    provider: "NousResearch",
    context: 32768,
    cost: 1,
    toolUse: true,
    description: "Great tool-use, low cost"
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    context: 32768,
    cost: 4,
    toolUse: true,
    description: "Meta's flagship instruct model"
  },
  {
    id: "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
    name: "Nemotron 70B",
    provider: "NVIDIA",
    context: 32768,
    cost: 4,
    toolUse: true,
    description: "NVIDIA-tuned Llama, strong"
  },
  {
    id: "Qwen/Qwen3-30B-A3B-Instruct-2507",
    name: "Qwen3 MoE 30B",
    provider: "Qwen",
    context: 32768,
    cost: 1,
    toolUse: true,
    description: "Cheap MoE (3B active), tool-use"
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "OpenAI",
    context: 131072,
    cost: 2,
    toolUse: true,
    description: "Lighter OSS model, 131k context"
  },
];

export const DEFAULT_MODEL = "openai/gpt-oss-120b";

export const MODEL_STORAGE_KEY = "selected-model";
