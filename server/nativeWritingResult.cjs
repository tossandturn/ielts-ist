function nativeWritingRecord(parsed, result, job) {
  if (!Number.isSafeInteger(job.userId) || job.userId <= 0) return null;
  const criteria = (result.analysis?.criteria || []).slice(0, 4);
  const ready = String(result.mode || '').startsWith('ai:') && criteria.length === 4 &&
    new Set(criteria.map(item => item.label)).size === 4 &&
    criteria.every(item => Number.isFinite(item.score) && item.score >= 0 && item.score <= 9) &&
    Number.isFinite(result.analysis?.overall) && result.analysis.overall >= 0 && result.analysis.overall <= 9 &&
    !result.analysis?.reviewRequired && result.analysis?.confidence !== 'low' && !result.review?.required && !result.contract?.review?.required;
  const items = parsed.kind === 'pair' ? parsed.items : [parsed];
  const ids = items.map(item => String(item.sourceTaskId || item.id || ''));
  const pair = ids[0].match(/^cam(\d+)-w-test(\d+)-task1$/);
  const itemId = parsed.kind === 'pair' && pair ? `cam${pair[1]}-test${pair[2]}::writing-full` : ids[0] || 'writing-custom';
  return {
    id: 'writing-' + job.id, userId: job.userId, itemId,
    mode: parsed.kind === 'pair' ? 'full-test' : 'single-task',
    score: ready ? { band: result.analysis.overall, source: 'server-ai-practice' } : {},
    result: {
      mode: String(result.mode || 'local'), feedback: String(result.feedback || '').slice(0, 60000),
      analysis: { overall: ready ? result.analysis.overall : null, criteria: ready ? criteria : [], reviewRequired: !ready },
      nativeContext: { kind: 'writing', scope: parsed.kind, taskIds: ids },
      pdfUrl: /^\/api\/report\/pdf\/[a-zA-Z0-9_-]+$/.test(result.pdfUrl || '') ? result.pdfUrl : '',
      provenance: result.provenance || result.contract?.provenance || {},
    },
    submittedAt: new Date(job.createdAt).toISOString(),
  };
}
module.exports = { nativeWritingRecord };
