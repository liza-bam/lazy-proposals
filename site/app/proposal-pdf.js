/* One vector PDF layout shared by the proposal button and CLI. No screen capture. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ProposalPDF=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const C={ink:'#17363c',mute:'#8fa3a4',line:'#d3ede6',tint:'#eafaf6',coral:'#f9426f',logo:'#ff6f5e',cream:'#fffdf6'};
function draw(doc,f,S,assets){
 const P=Object.assign({},S.proposal,{support:f.support||S.proposal.support}),M=40,W=612-2*M;
 doc.registerFont('r',assets.regular);doc.registerFont('b',assets.bold);
  // Logo: the paths of site/lazy-logo.svg, painted in the logo coral.
  const svg = assets.svg;
  const vb = svg.match(/viewBox="([\d.\s-]+)"/)[1].split(/\s+/).map(Number), h = 30, k = h / vb[3];
  doc.save().translate(M, M).scale(k);
  for (const m of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)) doc.path(m[1]).fill(C.logo);
  doc.restore();
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.font('r').fontSize(9).fillColor(C.mute).text(date, M, M + 10, { width: W, align: 'right' });

  let y = M + h + 18;
  doc.font('b').fontSize(22).fillColor(C.ink).text(P.title.replace('{owner}', f.owner), M, y, { width: W });
  y = doc.y + 2;
  for (const p of f.properties || [{ name: f.property, siteUrl: f.siteUrl }]) {
    const host = p.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    doc.font('r').fontSize(10).text(p.name + (host ? ' · ' + host : ''), M, doc.y, { width: W });
  }
  y = doc.y + 14;

  const PAD = 16, IN = W - 2 * PAD;
  const bullets = (items, x, top, w) => {
    let yy = top;
    for (const it of items) { doc.font('r').fontSize(9).fillColor(C.ink).text('•', x, yy).text(it, x + 10, yy, { width: w - 10 }); yy = doc.y + 2; }
    return yy;
  };
  const head = (title, badge, price, note, top) => {
    doc.font('b').fontSize(14).fillColor(C.ink).text(title, M + PAD, top);
    if (badge) {
      const tx = M + PAD + doc.widthOfString(title) + 8, bw = doc.font('b').fontSize(7.5).widthOfString(badge) + 12;
      doc.roundedRect(tx, top + 3, bw, 13, 6.5).fill(C.tint);
      doc.fillColor(C.ink).text(badge, tx + 6, top + 6);
    }
    doc.font('b').fontSize(14).fillColor(C.ink).text(price, M + PAD, top, { width: IN, align: 'right' });
    doc.font('b').fontSize(7.5).fillColor(C.mute).text(note, M + PAD, top + 19, { width: IN, align: 'right' });
    return top + 36;
  };

  // Card 1: Design & setup, its four lists in two columns.
  let top = y, yy = head(P.free.heading, '', P.free.price, P.free.note, top + PAD);
  const colW = (IN - 20) / 2, groups = P.free.groups;
  let rowTop = yy;
  for (let i = 0; i < groups.length; i += 2) {
    let bottom = rowTop;
    for (let j = 0; j < 2 && groups[i + j]; j++) {
      const [h3, items] = groups[i + j], x = M + PAD + j * (colW + 20);
      doc.font('b').fontSize(9.5).fillColor(C.ink).text(h3, x, rowTop);
      bottom = Math.max(bottom, bullets(items, x + 2, doc.y + 2, colW - 2));
    }
    rowTop = bottom + 8;
  }
  doc.roundedRect(M, top, W, rowTop - top + PAD - 8, 14).lineWidth(1).stroke(C.line);
  y = rowTop + PAD;

  // Card 2: Hosting & support.
  top = y; yy = head(P.support.heading, P.support.badge, P.support.price, P.support.note, top + PAD);
  yy = bullets(P.support.items, M + PAD + 2, yy, IN - 2) + 6;
  doc.moveTo(M + PAD, yy).lineTo(M + W - PAD, yy).lineWidth(1).stroke(C.line);
  doc.font('r').fontSize(9).fillColor(C.mute).text(P.cancel, M + PAD, yy + 8, { width: IN });
  yy = doc.y;
  doc.roundedRect(M, top, W, yy - top + PAD, 14).lineWidth(1).stroke(C.line);
  y = yy + PAD + 14;

  doc.font('b').fontSize(9.5).fillColor(C.ink).text(P.start, M, y);
  doc.font('r').fontSize(9).fillColor(C.ink).text(P.contact, M, y, { width: W, align: 'right' });

 return {pages:doc.bufferedPageRange().count};
}
return {draw};
});
