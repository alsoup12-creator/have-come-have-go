function normalizeText(value) {
  return String(value || "")
    .replace(/[０-９]/g, char => String(char.charCodeAt(0) - 65296))
    .replace(/[：]/g, ":").replace(/[，]/g, ",").replace(/[。．]/g, ".")
    .replace(/[／]/g, "/").replace(/[－—]/g, "-").replace(/\u00a0/g, " ");
}

function validDate(year, month, day, today) {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return value <= today ? value : "";
}

function extractFields(rawText, today) {
  const sourceLines = normalizeText(rawText).split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const labelOnly = /^(?:实付|实际支付|支付金额|付款金额|转账金额|交易金额|消费金额|订单金额|应付|合计|总计|金额|优惠|余额|订单号|交易单号|商户名称|商户|收款方|收款人|商家|交易对象|付款给|交易时间|支付时间|付款时间|日期)\s*:?$/;
  const lines = [];
  for (let i = 0; i < sourceLines.length; i++) {
    if (labelOnly.test(sourceLines[i]) && sourceLines[i + 1] && !labelOnly.test(sourceLines[i + 1])) {
      lines.push(`${sourceLines[i]} ${sourceLines[++i]}`);
    } else lines.push(sourceLines[i]);
  }
  const dateCandidates = [];
  lines.forEach((line, index) => {
    const context = /交易时间|支付时间|付款时间|消费时间|下单时间|创建时间|日期/.test(line) ? 50 : 0;
    const match = line.match(/(20\d{2})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*日?/);
    if (match) {
      const value = validDate(Number(match[1]), Number(match[2]), Number(match[3]), today);
      if (value) dateCandidates.push({ value, score: 80 + context - index * .01, line });
    }
  });
  const chosenDate = dateCandidates.sort((a, b) => b.score - a.score)[0];
  const date = chosenDate?.value || "";

  const timeCandidates = [];
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:\D|$)/g)) {
      timeCandidates.push({
        value: `${String(match[1]).padStart(2, "0")}:${match[2]}`,
        score: (/交易时间|支付时间|付款时间|消费时间|下单时间|创建时间/.test(line) ? 55 : 20) + (chosenDate?.line === line ? 35 : 0) - index * .01
      });
    }
  });
  const time = timeCandidates.sort((a, b) => b.score - a.score)[0]?.value || "";

  const amountCandidates = [];
  const strongLabel = /实付|实际支付|支付金额|付款金额|转账金额|交易金额|消费金额|订单金额|应付|合计|总计|金额/;
  const weakLabel = /支付|付款|转账|人民币|RMB|CNY|¥|￥/i;
  const excluded = /优惠|折扣|立减|原价|余额|找零|积分|单价|数量|订单号|流水号|交易单号|商户单号|卡号/;
  lines.forEach((line, lineIndex) => {
    for (const match of line.matchAll(/(?:¥|￥|RMB|CNY)?\s*(-?\d+(?:,\d{3})*(?:\.\d+)?)/gi)) {
      const token = match[1].replace(/,/g, "");
      if (/\.\d{3,}$/.test(token)) continue;
      const value = Number(token);
      if (!Number.isFinite(value) || value <= 0 || value >= 100000000 || token.replace(/\D/g, "").length > 9) continue;
      let score = strongLabel.test(line) ? 90 : weakLabel.test(line) ? 45 : 0;
      if (/[¥￥]|RMB|CNY/i.test(match[0])) score += 45;
      if (/\.\d{1,2}$/.test(token)) score += 14;
      if (excluded.test(line)) score -= 105;
      if (/20\d{2}[年\-\/.]/.test(line) && !strongLabel.test(line)) score -= 70;
      if (/\d{1,2}:\d{2}/.test(line) && !strongLabel.test(line)) score -= 35;
      amountCandidates.push({ value, score: score - lineIndex * .01 });
    }
  });
  const amounts = [...new Set(amountCandidates.filter(item => item.score >= 35).sort((a, b) => b.score - a.score).map(item => String(Math.round(item.value * 100) / 100)))];
  const amount = amounts.length === 1 ? amounts[0] : "";

  let title = "";
  const titlePattern = /^(?:商户名称|商户|收款方|收款人|商家|交易对象|付款给)\s*[:：]?\s*(.+)$/;
  for (const line of lines) {
    const match = line.match(titlePattern);
    if (match && match[1] && match[1].length <= 40) {
      title = match[1];
      break;
    }
  }
  return { amount, date, time, title, amounts };
}

module.exports = { extractFields, normalizeText };
