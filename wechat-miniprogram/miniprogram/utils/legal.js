const ITEMS = [
  {
    id: "loan-delivery",
    kind: "借款",
    title: "自然人之间借款，通常从实际交付借款时成立",
    summary: "《民法典》第667条界定借款合同，第679条规定自然人之间的借款合同，自贷款人提供借款时成立。",
    source: "《中华人民共和国民法典》第667条、第679条",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "transfer-not-enough",
    kind: "证据",
    title: "只有转账凭证，不当然等于已经证明借款",
    summary: "民间借贷司法解释要求结合借据等债权凭证和其他证据；仅有转账时，仍可能围绕转账原因、双方关系和上下文发生争议。",
    source: "最高人民法院民间借贷司法解释第2条、第16条",
    url: "https://wb.flk.npc.gov.cn/sfjs/texthtml/67ca8dc476d94646b234453984659629.html"
  },
  {
    id: "electronic-evidence",
    kind: "电子证据",
    title: "聊天、短信、交易记录、录音和图片都可能进入证据范围",
    summary: "民事证据规定列举了手机短信、即时通信、电子交易记录、通信记录、图片、音频等电子数据，并强调提交原件或可视为原件的载体。",
    source: "最高人民法院民事诉讼证据规定第14条、第15条",
    url: "https://www.court.gov.cn/zixun/xiangqing/212721.html"
  },
  {
    id: "gift",
    kind: "赠与",
    title: "赠与的核心，是无偿给予并由对方接受",
    summary: "《民法典》第657条规定，赠与合同是赠与人将自己的财产无偿给予受赠人，受赠人表示接受赠与的合同。",
    source: "《中华人民共和国民法典》第657条",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "marital-property",
    kind: "婚姻财产",
    title: "婚后所得需要区分夫妻共同财产与一方个人财产",
    summary: "《民法典》第1062条列举夫妻共同财产，第1063条列举一方个人财产。婚前财产、人身损害赔偿以及明确只归一方的遗嘱或赠与等，适用不同规则。",
    source: "《中华人民共和国民法典》第1062条、第1063条",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "marital-debt",
    kind: "夫妻债务",
    title: "婚内一方负债，不当然都是夫妻共同债务",
    summary: "《民法典》第1064条区分共同意思表示、家庭日常生活需要所负债务，以及超出家庭日常生活需要的一方个人名义债务；是否属于共同债务仍需结合用途和证据判断。",
    source: "《中华人民共和国民法典》第1064条",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "marital-property-agreement",
    kind: "财产约定",
    title: "夫妻可以书面约定婚前及婚内财产归属",
    summary: "《民法典》第1065条允许双方书面约定婚前财产和婚姻关系存续期间所得财产分别所有、共同所有或部分分别、部分共同所有。",
    source: "《中华人民共和国民法典》第1065条",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "cohabitation-property",
    kind: "同居财产",
    title: "未婚同居期间所得财产，不当然全部共同所有",
    summary: "婚姻家庭编解释（二）第4条规定，双方均无配偶的同居关系析产，有约定的按约定；无约定且协商不成时，各自所得原则上各自所有，共同出资或无法区分的财产再结合出资、共同生活和贡献等因素处理。",
    source: "最高人民法院民法典婚姻家庭编解释（二）第4条",
    url: "https://www.court.gov.cn/zixun/xiangqing/452771.html"
  },
  {
    id: "betrothal-gift-scope",
    kind: "彩礼",
    title: "是否属于彩礼，要结合给付目的、习俗、时间、方式和价值判断",
    summary: "涉彩礼司法解释第1至3条明确，彩礼是以婚姻为目的、依据习俗给付的财物；节日生日等时点价值不大的礼物、礼金和日常消费性支出等，一般不属于彩礼。",
    source: "最高人民法院涉彩礼纠纷司法解释第1条至第3条",
    url: "https://www.court.gov.cn/zixun/xiangqing/423442.html"
  },
  {
    id: "betrothal-gift-return",
    kind: "彩礼返还",
    title: "彩礼是否返还及返还多少，需要结合登记、共同生活和实际使用",
    summary: "涉彩礼司法解释第5条、第6条分别规定已登记且共同生活、未登记但已共同生活时的处理因素，包括共同生活时间、孕育情况、双方过错、彩礼实际使用及嫁妆等，不宜只凭是否登记作单一判断。",
    source: "最高人民法院涉彩礼纠纷司法解释第5条、第6条",
    url: "https://www.court.gov.cn/zixun/xiangqing/423442.html"
  }
];

function find(id) {
  return ITEMS.find(item => item.id === id) || null;
}

module.exports = { ITEMS, find };
