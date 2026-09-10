import { useEffect, useRef, useState } from 'react';
import { probeProvider } from '../../infrastructure/llm/openai-compatible';
import type { ProbeCapability, ProbeResult } from '../../infrastructure/llm/types';
import { probeOpenAlex, type OpenAlexProbeResult } from '../../infrastructure/literature/openalex';
import { normalizeConnectionError } from '../../infrastructure/network/errors';
import { memoryKeyStore } from '../../infrastructure/secrets/memory-key-store';
import styles from './ConnectionLab.module.css';

const capabilities: Array<{ id: ProbeCapability; label: string }> = [
  { id: 'completion', label: '普通完成' }, { id: 'streaming', label: '流式响应' },
  { id: 'structuredOutput', label: '结构化输出' }, { id: 'toolCalling', label: '工具调用' },
];

export function ConnectionLab() {
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [keyPresent, setKeyPresent] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [openAlex, setOpenAlex] = useState<OpenAlexProbeResult | null>(null);
  const [message, setMessage] = useState('所有能力均待验证。');
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => { active.current?.abort(); memoryKeyStore.clear(); }, []);

  async function runProviderProbe(capability: ProbeCapability) {
    active.current?.abort();
    active.current = new AbortController();
    setMessage(`正在测试${capabilities.find(({ id }) => id === capability)?.label ?? capability}…`);
    try {
      const result = await probeProvider({ baseUrl, model }, memoryKeyStore.get(), capability, active.current.signal);
      setResults((current) => [...current.filter(({ capability: id }) => id !== capability), result]);
      setMessage(result.detail);
    } catch (error) { setMessage(normalizeConnectionError(error).message); }
  }

  async function runOpenAlexProbe() {
    active.current?.abort();
    active.current = new AbortController();
    setMessage('正在从浏览器直接测试 OpenAlex…');
    try { const result = await probeOpenAlex(active.current.signal); setOpenAlex(result); setMessage('OpenAlex 浏览器基础检索成功。'); }
    catch (error) { setMessage(normalizeConnectionError(error).message); }
  }

  return (
    <section className={styles.lab} aria-labelledby="lab-title">
      <div className={styles.heading}><div><p>CONNECTION LAB / 0.1-B</p><h2 id="lab-title">浏览器连接探针</h2></div><span>真实模式</span></div>
      <div className={styles.grid}>
        <div className={styles.provider}>
          <h3>OpenAI-compatible Provider</h3>
          <p className={styles.help}>每次能力测试会向你填写的服务发送一条最小请求，可能产生费用。密钥只保存在当前页面内存中。</p>
          <label>Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} inputMode="url" /></label>
          <label>Model ID<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="由服务商提供" /></label>
          <label>API Key<input type="password" autoComplete="off" onChange={(event) => { memoryKeyStore.set(event.target.value); setKeyPresent(Boolean(event.target.value)); }} placeholder="刷新后清除" /></label>
          <div className={styles.probes}>{capabilities.map(({ id, label }) => { const result = results.find(({ capability }) => capability === id); return <button key={id} type="button" disabled={!keyPresent || !model} onClick={() => void runProviderProbe(id)}>{label}<small>{result?.state ?? '待验证'}</small></button>; })}</div>
          <button className={styles.cancel} type="button" onClick={() => { active.current?.abort(); setMessage('已请求取消当前探针。'); }}>取消当前请求</button>
        </div>
        <div className={styles.source}>
          <h3>OpenAlex 文献来源</h3>
          <p className={styles.help}>使用固定非敏感查询测试匿名基础检索；这不代表配额、语义检索或未来策略已验证。</p>
          <dl><div><dt>基础检索</dt><dd>{openAlex ? '已测试' : '待验证'}</dd></div><div><dt>结果数量</dt><dd>{openAlex?.count.toLocaleString() ?? '—'}</dd></div><div><dt>首条题名</dt><dd>{openAlex?.firstTitle ?? '—'}</dd></div></dl>
          <button className={styles.primary} type="button" onClick={() => void runOpenAlexProbe()}>测试匿名检索</button>
        </div>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{message}</p>
    </section>
  );
}
