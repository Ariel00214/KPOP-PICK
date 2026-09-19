"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { PurchaseIntent, RecommendationPlan } from "@/lib/ai";

type Result = {understood:PurchaseIntent;summary:string;plans:RecommendationPlan[];provider:"llm"|"rules-fallback"};
const priorityLabel = {price:"价格更低",speed:"发货更快",benefits:"小卡/特典更多"};

export default function Assistant() {
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState<Result|null>(null);
  const [error,setError] = useState("");

  const run = async () => {
    if (query.trim().length < 5) return setError("请再具体描述一点你的购买需求。");
    setLoading(true);setError("");setResult(null);
    try {
      void fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"ai_recommendation_started"})});
      const response = await fetch("/api/recommend",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResult(data);
      void fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"ai_recommendation_completed",properties:{provider:data.provider,planCount:data.plans.length}})});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI 暂时不可用，请稍后再试。");
    } finally { setLoading(false); }
  };

  return <AppShell>
    <h1 className="page-title">AI 帮我选</h1>
    <p className="lead">直接告诉我你想买什么、预算和在意的点，我会理解整句话后帮你比较。</p>
    <div className="form-card card">
      <div className="field assistant-input">
        <label htmlFor="purchase-request">描述你的购买需求</label>
        <textarea id="purchase-request" value={query} onChange={event=>setQuery(event.target.value)} placeholder="例如：我想买 BLACKPINK DEADLINE，预算 150 元以内，想要 Jennie，不接受随机，希望国内渠道，最好小卡多一点。" maxLength={1000}/>
        <span>{query.length}/1000</span>
      </div>
      <button className="primary wide" onClick={run} disabled={loading||query.trim().length<5}>{loading?"正在理解并比较可靠数据…":"让 AI 分析并推荐"}</button>
      <p className="assistant-hint">你可以像聊天一样描述，不需要按固定格式填写。</p>
    </div>
    {error&&<div className="notice section">{error}</div>}
    {result&&<>
      <section className="analysis-card card">
        <div className="analysis-title"><strong>AI 理解到的需求</strong><span>{result.provider==="llm"?"大模型分析":"智能降级分析"}</span></div>
        <div className="intent-list">
          {(result.understood.artist||result.understood.album)&&<span>{[result.understood.artist,result.understood.album].filter(Boolean).join(" · ")}</span>}
          {result.understood.member&&<span>成员：{result.understood.member}</span>}
          {result.understood.budget&&<span>预算：¥{result.understood.budget}</span>}
          {result.understood.avoidRandom&&<span>不接受随机</span>}
          {result.understood.domesticOnly&&<span>国内渠道</span>}
          <span>优先：{priorityLabel[result.understood.priority]}</span>
        </div>
        <p>{result.summary}</p>
      </section>
      <div className="plans">{result.plans.map((plan,index)=><article className="plan card" key={plan.offer.id}>
        <div className="offer-head"><div><span className="eyebrow">方案 {String.fromCharCode(65+index)}</span><h3>{plan.artist} · {plan.albumTitle}</h3></div><span className="risk">随机风险：{plan.offer.memberSelectable?"低":"中"}</span></div>
        <div className="plan-price">{plan.offer.estimatedLandedPrice!==null?`¥${plan.offer.estimatedLandedPrice}`:"费用待确认"}</div>
        <p className="recommend-reason">{plan.reason}</p>
        <div className="inclusion">{plan.offer.inclusions.map(item=><div key={item}>＋ {item}</div>)}</div>
        <p className="meta">{plan.offer.channel} · {plan.offer.version} · {plan.offer.shippingTime}</p>
        <Link className="primary wide" style={{display:"block",textAlign:"center"}} href={`/album/${plan.albumId}`}>查看完整方案</Link>
      </article>)}</div>
    </>}
    <p className="footnote">AI 只负责理解需求和解释建议；价格、库存与截止日期仍以可靠数据和原购买渠道为准。</p>
  </AppShell>;
}
