import { useEffect, useRef, useState } from "react";
import { probeProvider } from "../../infrastructure/llm/openai-compatible";
import type {
  ProbeCapability,
  ProbeResult,
  ProviderFormat,
} from "../../infrastructure/llm/types";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import { defaultProviderDraft, type ProviderDraft, type SavedProviderProfile } from "../../domain/provider/provider-profile";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { Button } from "../../shared/ui";
import styles from "./ConnectionLab.module.css";

const capabilities: Array<{ id: ProbeCapability; label: string }> = [
  { id: "completion", label: "普通完成" },
  { id: "streaming", label: "流式响应" },
  { id: "structuredOutput", label: "结构化输出" },
  { id: "toolCalling", label: "工具调用" },
];
const stateLabels: Record<ProbeResult["state"], string> = {
  supported: "支持",
  unsupported: "不支持",
  failed: "测试失败",
  unknown: "待验证",
};

export function ConnectionLab({ onSaved }: { onSaved?: (profile: SavedProviderProfile) => void }) {
  const [name, setName] = useState(defaultProviderDraft.name);
  const [providerType, setProviderType] = useState<ProviderDraft["providerType"]>(defaultProviderDraft.providerType);
  const [baseUrl, setBaseUrl] = useState(defaultProviderDraft.baseUrl);
  const [format, setFormat] = useState<ProviderFormat>(defaultProviderDraft.format);
  const [model, setModel] = useState(defaultProviderDraft.model);
  const [keyPresent, setKeyPresent] = useState(Boolean(memoryKeyStore.get()));
  const [saved, setSaved] = useState<SavedProviderProfile | null>(null);
  const [lastTest, setLastTest] = useState<{ state: ProbeResult["state"]; testedAt: string } | null>(null);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [message, setMessage] = useState("所有能力均待验证。");
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    void new ProviderProfileRepository().getActive().then((profile) => {
      if (!mounted || !profile) return;
      setSaved(profile); setName(profile.name); setProviderType(profile.providerType);
      setFormat(profile.format); setBaseUrl(profile.baseUrl); setModel(profile.model);
    });
    return () => { mounted = false; active.current?.abort(); };
  }, []);

  async function executeProviderProbe(capability: ProbeCapability, controller: AbortController) {
    setMessage(
      `正在测试${capabilities.find(({ id }) => id === capability)?.label ?? capability}…`,
    );
    try {
      const result = await probeProvider(
        { format, baseUrl, model },
        memoryKeyStore.get(),
        capability,
        controller.signal,
      );
      setResults((current) => [
        ...current.filter(({ capability: id }) => id !== capability),
        result,
      ]);
      setMessage(result.detail);
      if (capability === "completion") setLastTest({ state: result.state, testedAt: new Date().toISOString() });
      return result;
    } catch (error) {
      const normalized = normalizeConnectionError(error);
      const result: ProbeResult = { capability, state: "failed", detail: normalized.message, usageReporting: "unknown" };
      setResults((current) => [...current.filter(({ capability: id }) => id !== capability), result]);
      setMessage(normalized.message);
      if (capability === "completion") setLastTest({ state: "failed", testedAt: new Date().toISOString() });
      return result;
    }
  }

  async function runProviderProbe(capability: ProbeCapability) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    await executeProviderProbe(capability, controller);
  }

  async function runAllProviderProbes() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    for (const { id } of capabilities) {
      if (controller.signal.aborted) break;
      await executeProviderProbe(id, controller);
    }
    if (!controller.signal.aborted) setMessage("四项能力测试已完成；请查看各项状态与诊断。");
  }

  async function saveProvider() {
    try {
      const draftChanged = !saved || saved.name !== name || saved.providerType !== providerType || saved.format !== format || saved.baseUrl !== baseUrl || saved.model !== model;
      const profile = await new ProviderProfileRepository().saveActive(
        { name, providerType, format, baseUrl, model },
        lastTest ? { state: lastTest.state, testedAt: lastTest.testedAt } : draftChanged ? { state: "unknown", testedAt: null } : undefined,
      );
      setSaved(profile);
      setMessage(keyPresent ? "Provider 配置已保存并设为当前使用。" : "非敏感配置已保存；使用前请重新输入 API Key。");
      onSaved?.(profile);
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存配置失败。"); }
  }

  return (
    <section className={styles.lab} aria-labelledby="lab-title">
      <div className={styles.heading}>
        <div>
          <p>MODEL PROVIDER</p>
          <h2 id="lab-title">模型 Provider</h2>
        </div>
        <span>真实模式</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.provider}>
          <h3>模型 Provider</h3>
          <p className={styles.help}>
            每项能力测试会发送一条最小请求；一键测试会顺序发送四次，可能产生费用。密钥只保存在当前页面内存中。
          </p>
          <dl>
            <div><dt>当前 Provider</dt><dd>{saved?.name ?? "尚未保存"}</dd></div>
            <div><dt>Provider 类型</dt><dd>{saved?.providerType ?? "—"}</dd></div>
            <div><dt>请求协议</dt><dd>{saved?.format ?? "—"}</dd></div>
            <div><dt>模型</dt><dd>{saved?.model || "—"}</dd></div>
            <div><dt>状态</dt><dd>{saved ? (keyPresent ? `可使用 · 最近测试${stateLabels[saved.lastTestState]}` : "需要重新输入 API Key") : "未配置"}</dd></div>
          </dl>
          <label>
            Provider 名称
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Provider 类型
            <select value={providerType} onChange={(event) => setProviderType(event.target.value as ProviderDraft["providerType"])}>
              <option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option><option value="anthropic">Anthropic</option><option value="custom">自定义</option>
            </select>
          </label>
          <label>
            Provider Format
            <select
              value={format}
              onChange={(event) => {
                const next = event.target.value as ProviderFormat;
                setFormat(next);
                setResults([]);
              }}
            >
              <option value="openai-chat">OpenAI Chat Completions</option>
              <option value="openai-responses">OpenAI Responses API</option>
              <option value="anthropic-messages">Anthropic Messages API</option>
            </select>
          </label>
          <label>
            Base URL
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              inputMode="url"
            />
          </label>
          <label>
            Model ID
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="由服务商提供"
            />
          </label>
          <label>
            API Key
            <input
              type="password"
              autoComplete="off"
              onChange={(event) => {
                memoryKeyStore.set(event.target.value);
                setKeyPresent(Boolean(event.target.value));
              }}
              placeholder="刷新后清除"
            />
          </label>
          <div className={styles.probes}>
            {capabilities.map(({ id, label }) => {
              const result = results.find(
                ({ capability }) => capability === id,
              );
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!keyPresent || !model}
                  onClick={() => void runProviderProbe(id)}
                >
                  {label}
                  <small>{result ? stateLabels[result.state] : "待验证"}</small>
                </button>
              );
            })}
          </div>
          <div className={styles.actions}>
            <Button type="button" disabled={!keyPresent || !model} onClick={() => void runProviderProbe("completion")}>测试连接</Button>
            <Button type="button" variant="primary" disabled={!model || !name || !baseUrl} onClick={() => void saveProvider()}>保存配置</Button>
          </div>
          <button
            className={styles.primary}
            type="button"
            disabled={!keyPresent || !model}
            onClick={() => void runAllProviderProbes()}
          >
            一键测试四项能力
          </button>
          <button
            className={styles.cancel}
            type="button"
            onClick={() => {
              active.current?.abort();
              setMessage("已请求取消当前探针。");
            }}
          >
            取消当前请求
          </button>
        </div>
      </div>
      <p className={styles.status} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
