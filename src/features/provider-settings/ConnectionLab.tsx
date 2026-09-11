import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { probeProvider } from "../../infrastructure/llm/openai-compatible";
import type {
  ProbeCapability,
  ProbeResult,
  ProviderFormat,
} from "../../infrastructure/llm/types";
import { normalizeConnectionError } from "../../infrastructure/network/errors";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import {
  defaultProviderDraft,
  type ProviderDraft,
  type SavedProviderProfile,
} from "../../domain/provider/provider-profile";
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

export function ConnectionLab({
  onSaved,
}: {
  onSaved?: (profile: SavedProviderProfile) => void;
}) {
  const [name, setName] = useState(defaultProviderDraft.name);
  const [providerType, setProviderType] = useState<
    ProviderDraft["providerType"]
  >(defaultProviderDraft.providerType);
  const [baseUrl, setBaseUrl] = useState(defaultProviderDraft.baseUrl);
  const [format, setFormat] = useState<ProviderFormat>(
    defaultProviderDraft.format,
  );
  const [model, setModel] = useState(defaultProviderDraft.model);
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState<SavedProviderProfile | null>(null);
  const [profiles, setProfiles] = useState<SavedProviderProfile[]>([]);
  const [lastTest, setLastTest] = useState<{
    state: ProbeResult["state"];
    testedAt: string;
  } | null>(null);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [message, setMessage] = useState("所有能力均待验证。");
  const active = useRef<AbortController | null>(null);
  const repository = useMemo(() => new ProviderProfileRepository(), []);
  const keyPresent = Boolean(apiKey);
  const activeProfile = profiles.find((profile) => profile.active) ?? null;
  const activeKeyPresent = Boolean(
    activeProfile && memoryKeyStore.get(activeProfile.id),
  );

  const editProfile = useCallback((profile: SavedProviderProfile) => {
    setSaved(profile);
    setName(profile.name);
    setProviderType(profile.providerType);
    setFormat(profile.format);
    setBaseUrl(profile.baseUrl);
    setModel(profile.model);
    const scopedKey = memoryKeyStore.get(profile.id);
    const key = scopedKey || (profile.active ? memoryKeyStore.get() : "");
    if (key && !scopedKey) memoryKeyStore.set(key, profile.id);
    setApiKey(key);
    setLastTest(
      profile.lastTestedAt
        ? { state: profile.lastTestState, testedAt: profile.lastTestedAt }
        : null,
    );
    setResults([]);
  }, []);

  function newProfile() {
    setSaved(null);
    setName(defaultProviderDraft.name);
    setProviderType(defaultProviderDraft.providerType);
    setFormat(defaultProviderDraft.format);
    setBaseUrl(defaultProviderDraft.baseUrl);
    setModel(defaultProviderDraft.model);
    setApiKey("");
    setLastTest(null);
    setResults([]);
    setMessage("正在创建新的 Provider 配置。");
  }

  useEffect(() => {
    let mounted = true;
    void Promise.all([repository.list(), repository.getActive()]).then(([items, profile]) => {
      if (!mounted) return;
      setProfiles(items);
      if (profile) editProfile(profile);
    });
    return () => {
      mounted = false;
      active.current?.abort();
    };
  }, [editProfile, repository]);

  async function executeProviderProbe(
    capability: ProbeCapability,
    controller: AbortController,
  ) {
    setMessage(
      `正在测试${capabilities.find(({ id }) => id === capability)?.label ?? capability}…`,
    );
    try {
      const result = await probeProvider(
        { format, baseUrl, model },
        apiKey,
        capability,
        controller.signal,
      );
      setResults((current) => [
        ...current.filter(({ capability: id }) => id !== capability),
        result,
      ]);
      setMessage(result.detail);
      if (capability === "completion")
        setLastTest({
          state: result.state,
          testedAt: new Date().toISOString(),
        });
      return result;
    } catch (error) {
      const normalized = normalizeConnectionError(error);
      const result: ProbeResult = {
        capability,
        state: "failed",
        detail: normalized.message,
        usageReporting: "unknown",
      };
      setResults((current) => [
        ...current.filter(({ capability: id }) => id !== capability),
        result,
      ]);
      setMessage(normalized.message);
      if (capability === "completion")
        setLastTest({ state: "failed", testedAt: new Date().toISOString() });
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
    if (!controller.signal.aborted)
      setMessage("四项能力测试已完成；请查看各项状态与诊断。");
  }

  async function saveProvider() {
    try {
      const draftChanged =
        !saved ||
        saved.name !== name ||
        saved.providerType !== providerType ||
        saved.format !== format ||
        saved.baseUrl !== baseUrl ||
        saved.model !== model;
      const activate = saved?.active ?? profiles.length === 0;
      const profile = await repository.saveProfile(
        { name, providerType, format, baseUrl, model },
        {
          id: saved?.id,
          activate,
          test: lastTest
            ? { state: lastTest.state, testedAt: lastTest.testedAt }
            : draftChanged
              ? { state: "unknown", testedAt: null }
              : undefined,
        },
      );
      memoryKeyStore.set(apiKey, profile.id);
      if (profile.active) memoryKeyStore.activate(profile.id);
      setSaved(profile);
      setProfiles(await repository.list());
      setMessage(
        keyPresent
          ? profile.active
            ? "Provider 配置已保存并设为当前使用。"
            : "Provider 配置已保存；可在列表中设为当前使用。"
          : "非敏感配置已保存；使用前请重新输入 API Key。",
      );
      onSaved?.(profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存配置失败。");
    }
  }

  async function activateProfile(profile: SavedProviderProfile) {
    const next = await repository.setActive(profile.id);
    memoryKeyStore.activate(profile.id);
    setProfiles(await repository.list());
    editProfile(next);
    setMessage(
      memoryKeyStore.get(profile.id)
        ? `已切换到 ${profile.name}。`
        : `已切换到 ${profile.name}；使用前请补充 API Key。`,
    );
  }

  async function deleteProfile(profile: SavedProviderProfile) {
    if (
      !window.confirm(
        `删除 Provider“${profile.name}”？此操作不会删除研究会话。`,
      )
    )
      return;
    await repository.delete(profile.id);
    memoryKeyStore.remove(profile.id);
    let next = await repository.list();
    if (profile.active && next[0]) {
      const fallback = await repository.setActive(next[0].id);
      memoryKeyStore.activate(fallback.id);
      next = await repository.list();
    }
    setProfiles(next);
    if (saved?.id === profile.id) {
      const fallback = next.find((item) => item.active) ?? next[0];
      if (fallback) editProfile(fallback);
      else newProfile();
    }
    setMessage(`已删除 ${profile.name} 配置。`);
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
            每项能力测试会发送一条最小请求；一键测试会顺序发送四次，可能产生费用。密钥只保存在当前浏览器会话中，刷新后可继续使用，关闭标签页后清除。
          </p>
          <div className={styles.profileManager}>
            <div className={styles.profileManagerHeading}>
              <strong>已保存 Provider</strong>
              <Button type="button" onClick={newProfile}>
                添加 Provider
              </Button>
            </div>
            {profiles.length ? (
              <div className={styles.profileList}>
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`${styles.profileItem} ${saved?.id === profile.id ? styles.editing : ""}`}
                  >
                    <button type="button" onClick={() => editProfile(profile)}>
                      <strong>{profile.name}</strong>
                      <small>
                        {profile.model || "未填写模型"} ·{" "}
                        {profile.active
                          ? "当前使用"
                          : stateLabels[profile.lastTestState]}
                      </small>
                    </button>
                    <div>
                      {!profile.active ? (
                        <Button
                          type="button"
                          onClick={() => void activateProfile(profile)}
                        >
                          设为当前
                        </Button>
                      ) : (
                        <span>当前</span>
                      )}
                      <button
                        type="button"
                        className={styles.deleteProfile}
                        onClick={() => void deleteProfile(profile)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyProfiles}>还没有保存的 Provider。</p>
            )}
          </div>
          <dl>
            <div>
              <dt>当前 Provider</dt>
              <dd>{activeProfile?.name ?? "尚未保存"}</dd>
            </div>
            <div>
              <dt>Provider 类型</dt>
              <dd>{activeProfile?.providerType ?? "—"}</dd>
            </div>
            <div>
              <dt>请求协议</dt>
              <dd>{activeProfile?.format ?? "—"}</dd>
            </div>
            <div>
              <dt>模型</dt>
              <dd>{activeProfile?.model || "—"}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>
                {activeProfile
                  ? activeKeyPresent
                    ? `可使用 · 最近测试${stateLabels[activeProfile.lastTestState]}`
                    : "需要重新输入 API Key"
                  : "未配置"}
              </dd>
            </div>
          </dl>
          <label>
            Provider 名称
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Provider 类型
            <select
              value={providerType}
              onChange={(event) =>
                setProviderType(
                  event.target.value as ProviderDraft["providerType"],
                )
              }
            >
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">自定义</option>
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
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
              }}
              placeholder={keyPresent ? "已在当前会话保存" : "关闭标签页后清除"}
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
            <Button
              type="button"
              disabled={!keyPresent || !model}
              onClick={() => void runProviderProbe("completion")}
            >
              测试连接
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!model || !name || !baseUrl}
              onClick={() => void saveProvider()}
            >
              保存配置
            </Button>
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
